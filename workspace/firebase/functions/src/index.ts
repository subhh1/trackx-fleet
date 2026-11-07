import * as functions from 'firebase-functions/v1';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { randomBytes } from 'crypto';

initializeApp();

const db = getDatabase();

async function requireAdmin(context: functions.https.CallableContext): Promise<void> {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminSnapshot = await db.ref(`admins/${context.auth.uid}`).once('value');
  if (!adminSnapshot.exists()) {
    throw new functions.https.HttpsError('permission-denied', 'Administrator access is required');
  }
}

function getErrorCode(reason: unknown): string | undefined {
  if (typeof reason === 'object' && reason !== null && 'code' in reason && typeof reason.code === 'string') {
    return reason.code;
  }
  return undefined;
}

/**
 * Callable: Create a single-use registration token for an administrator.
 */
export const createRegistrationToken = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);

  const driverName = typeof data?.driverName === 'string' ? data.driverName.trim() : '';
  if (driverName.length < 2 || driverName.length > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'Driver name must be between 2 and 100 characters');
  }

  const driversSnapshot = await db.ref('drivers').once('value');
  let highestTrackingNumber = 0;
  driversSnapshot.forEach(driverSnapshot => {
    const trackingId = driverSnapshot.child('trackingId').val();
    const match = typeof trackingId === 'string' ? /^TRK-(\d+)$/.exec(trackingId) : null;
    if (match) highestTrackingNumber = Math.max(highestTrackingNumber, Number(match[1]));
  });

  const counter = await db.ref('meta/nextTrackingNumber').transaction(current => {
    const nextNumber = typeof current === 'number' ? current + 1 : highestTrackingNumber + 1;
    return Math.max(nextNumber, highestTrackingNumber + 1);
  });
  const trackingNumber = counter.snapshot.val();
  if (!counter.committed || typeof trackingNumber !== 'number') {
    throw new functions.https.HttpsError('internal', 'Unable to reserve a tracking ID');
  }

  const tokenRef = db.ref('registrationTokens').push();
  if (!tokenRef.key) {
    throw new functions.https.HttpsError('internal', 'Unable to create a registration token');
  }

  const now = Date.now();
  const registrationToken = {
    id: tokenRef.key,
    trackingId: `TRK-${String(trackingNumber).padStart(3, '0')}`,
    driverName,
    token: randomBytes(32).toString('hex'),
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    used: false,
  };

  await tokenRef.set(registrationToken);
  return registrationToken;
});

/**
 * Cloud Function: Validate registration token
 * Called when driver app scans QR code
 */
export const validateRegistrationToken = functions.https.onCall(async (data, context) => {
  // Note: This function is called BEFORE the driver has an auth account
  // The driver app creates anonymous auth first, then calls this function
  // So we don't require auth here - the token itself is the security mechanism
  // (256-bit random, single-use, 24-hour expiry)
  
  const { token } = data;
  
  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid token format');
  }
  
  // Validate token format (64 hex characters = 256 bits)
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid token format');
  }

  // Search for matching token
  const tokensRef = db.ref('registrationTokens');
  const snapshot = await tokensRef.orderByChild('token').equalTo(token).once('value');
  
  if (!snapshot.exists()) {
    throw new functions.https.HttpsError('not-found', 'Registration token not found');
  }

  let tokenId: string | null = null;
  let tokenData: any = null;

  snapshot.forEach((child) => {
    tokenId = child.key;
    tokenData = child.val();
  });

  if (!tokenId || !tokenData) {
    throw new functions.https.HttpsError('internal', 'Token lookup failed');
  }

  // Check if already used
  if (tokenData.used) {
    throw new functions.https.HttpsError('already-exists', 'This registration token has already been used');
  }

  // Check if expired
  if (Date.now() > tokenData.expiresAt) {
    throw new functions.https.HttpsError('deadline-exceeded', 'This registration token has expired');
  }

  return {
    valid: true,
    trackingId: tokenData.trackingId,
    driverName: tokenData.driverName,
    tokenId: tokenId,
  };
});

/**
 * Cloud Function: Complete driver registration
 * Marks token as used and creates driver record
 */
export const completeRegistration = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { tokenId } = data || {};
  const uid = context.auth.uid;
  if (typeof tokenId !== 'string' || tokenId.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const tokenRef = db.ref(`registrationTokens/${tokenId}`);
  const driverRef = db.ref(`drivers/${uid}`);
  const driverSnapshot = await driverRef.once('value');
  if (driverSnapshot.exists()) {
    throw new functions.https.HttpsError('already-exists', 'This account is already registered');
  }

  const now = Date.now();
  const tokenTransaction = await tokenRef.transaction(current => {
    if (!current || current.used || typeof current.expiresAt !== 'number' || now > current.expiresAt) {
      return;
    }

    return {
      ...current,
      used: true,
      usedAt: now,
      usedByUid: uid,
    };
  });

  if (!tokenTransaction.committed) {
    const tokenData = tokenTransaction.snapshot.val();
    if (!tokenData) {
      throw new functions.https.HttpsError('not-found', 'Token not found');
    }
    if (tokenData.used) {
      throw new functions.https.HttpsError('already-exists', 'Token already used');
    }
    if (typeof tokenData.expiresAt !== 'number' || now > tokenData.expiresAt) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Token expired');
    }
    throw new functions.https.HttpsError('aborted', 'Registration could not be completed; please retry');
  }

  const tokenData = tokenTransaction.snapshot.val();
  if (!tokenData) {
    throw new functions.https.HttpsError('internal', 'Registration token data is missing');
  }

  await driverRef.set({
    name: tokenData.driverName,
    trackingId: tokenData.trackingId,
    status: 'offline',
    sharingEnabled: false,
    lastUpdated: now,
    lastConnection: now,
    registeredAt: now,
    lastLocation: {
      latitude: 0,
      longitude: 0,
      speed: 0,
      accuracy: 0,
    },
  });

  return { success: true, trackingId: tokenData.trackingId };
});

/**
 * Callable: Update a driver's sharing state from the administrator dashboard.
 */
export const setDriverSharing = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);

  const { uid, sharingEnabled } = data || {};
  if (typeof uid !== 'string' || !uid || typeof sharingEnabled !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'A driver UID and sharing state are required');
  }
  if (sharingEnabled) {
    throw new functions.https.HttpsError('permission-denied', 'Drivers must enable location sharing from their device');
  }

  const driverRef = db.ref(`drivers/${uid}`);
  const driverSnapshot = await driverRef.once('value');
  if (!driverSnapshot.exists()) {
    throw new functions.https.HttpsError('not-found', 'Driver not found');
  }

  await driverRef.update({
    sharingEnabled: false,
    status: 'sharing_disabled',
  });
  return { success: true };
});

/**
 * Callable: Enable location sharing at the driver's request.
 */
export const enableDriverSharing = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const driverRef = db.ref(`drivers/${context.auth.uid}`);
  const driverSnapshot = await driverRef.once('value');
  if (!driverSnapshot.exists()) {
    throw new functions.https.HttpsError('not-found', 'Driver registration was not found');
  }

  await driverRef.update({
    sharingEnabled: true,
    status: 'offline',
  });
  return { success: true };
});

/**
 * Callable: Remove a driver, their location history, and their Firebase Auth account.
 */
export const removeDriver = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);

  const uid = typeof data?.uid === 'string' ? data.uid : '';
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'A driver UID is required');
  }

  const driverSnapshot = await db.ref(`drivers/${uid}`).once('value');
  if (!driverSnapshot.exists()) {
    throw new functions.https.HttpsError('not-found', 'Driver not found');
  }

  try {
    await getAuth().deleteUser(uid);
  } catch (reason) {
    if (getErrorCode(reason) !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', 'Unable to remove the driver account');
    }
  }

  await db.ref().update({
    [`drivers/${uid}`]: null,
    [`locationHistory/${uid}`]: null,
  });
  return { success: true };
});

/**
 * Cloud Function: Update driver location
 * Called periodically from driver app
 */
export const updateLocation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const uid = context.auth.uid;
  const { latitude, longitude, speed, accuracy } = data;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid coordinates');
  }

  const now = Date.now();

  // Update current location
  const updates: Record<string, any> = {
    [`drivers/${uid}/lastLocation`]: {
      latitude,
      longitude,
      speed: speed || 0,
      accuracy: accuracy || 0,
    },
    [`drivers/${uid}/lastUpdated`]: now,
    [`drivers/${uid}/lastConnection`]: now,
    [`drivers/${uid}/status`]: 'online',
  };

  // Add to location history
  const historyKey = `loc_${now}`;
  updates[`locationHistory/${uid}/${historyKey}`] = {
    latitude,
    longitude,
    speed: speed || 0,
    accuracy: accuracy || 0,
    timestamp: now,
  };

  await db.ref().update(updates);

  return { success: true };
});

/**
 * Scheduled Function: Clean up old location history
 * Runs daily, removes records older than 7 days
 */
export const cleanupOldLocations = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Process drivers one at a time to avoid loading all data into memory
    const driversSnap = await db.ref('locationHistory').limitToFirst(100).once('value');
    
    if (!driversSnap.exists()) return null;

    let totalCleaned = 0;
    const batchUpdates: Record<string, any> = {};

    driversSnap.forEach((driverSnap) => {
      const uid = driverSnap.key;
      if (!uid) return;

      driverSnap.forEach((recordSnap) => {
        const record = recordSnap.val();
        if (record && record.timestamp < sevenDaysAgo) {
          // Use null to remove in a batch update
          batchUpdates[`locationHistory/${uid}/${recordSnap.key}`] = null;
          totalCleaned++;
        }
      });
    });

    // Batch delete (max 1000 operations per batch)
    if (Object.keys(batchUpdates).length > 0) {
      // Process in chunks of 500 to avoid exceeding RTDB limits
      const keys = Object.keys(batchUpdates);
      for (let i = 0; i < keys.length; i += 500) {
        const chunk: Record<string, any> = {};
        for (let j = i; j < Math.min(i + 500, keys.length); j++) {
          chunk[keys[j]] = null;
        }
        await db.ref().update(chunk);
      }
    }
    
    console.log(`Cleaned up ${totalCleaned} old location records`);
    return null;
  });

/**
 * Scheduled Function: Detect stale drivers
 * Marks drivers as stale if no update in 15 minutes
 */
export const detectStaleDrivers = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const fifteenMinutesAgo = Date.now() - (15 * 60 * 1000);
    
    const driversSnap = await db.ref('drivers').once('value');
    
    if (!driversSnap.exists()) return null;

    const updates: Record<string, any> = {};

    driversSnap.forEach((driverSnap) => {
      const uid = driverSnap.key;
      const driver = driverSnap.val();
      
      if (!uid || !driver) return;
      
      if (driver.sharingEnabled && driver.status === 'online' && driver.lastUpdated < fifteenMinutesAgo) {
        updates[`drivers/${uid}/status`] = 'location_stale';
      }
    });

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      console.log(`Marked ${Object.keys(updates).length} drivers as stale`);
    }

    return null;
  });
