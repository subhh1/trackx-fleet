import { Driver, RegistrationToken } from '../types';

// Generate realistic GPS coordinates around a city center
function generateCoords(center: { lat: number; lng: number }, spread: number) {
  return {
    lat: center.lat + (Math.random() - 0.5) * spread,
    lng: center.lng + (Math.random() - 0.5) * spread,
  };
}

const cityCenter = { lat: 28.6139, lng: 77.2090 }; // Delhi

const driverNames = [
  'Rahul Kumar', 'Aman Sharma', 'Rohit Singh', 'Vikram Patel',
  'Suresh Yadav', 'Amit Gupta', 'Rajesh Verma', 'Deepak Joshi',
  'Manoj Tiwari', 'Sanjay Mishra', 'Anil Chauhan', 'Pradeep Saxena',
  'Ravi Dubey', 'Kiran Rao', 'Nitin Agarwal', 'Mohit Srivastava',
  'Ajay Reddy', 'Vijay Nair', 'Sunil Mehta', 'Gaurav Bhatt',
  'Hemant Pillai', 'Ashok Iyer', 'Dinesh Kulkarni', 'Ramesh Desai',
  'Pankaj Malhotra', 'Tarun Kapoor', 'Yogesh Chawla', 'Naveen Bhatia',
  'Sandeep Arora', 'Mukund Thakur', 'Lalit Bansal', 'Bharat Goel',
  'Harish Chadha', 'Kamal Dewan', 'Parth Sehgal', 'Varun Khanna',
  'Arun Menon', 'Sameer Datta', 'Jatin Puri', 'Nikhil Sood',
  'Tushar Bhandari', 'Kunal Grover', 'Rajat Saxena', 'Alok Sinha',
  'Vishal Pandey', 'Girish Swamy', 'Prakash Hegde', 'Sachin More',
  'Dhruv Malhotra', 'Ishaan Kapoor'
];

const statuses: Array<Driver['status']> = ['online', 'online', 'online', 'online', 'offline', 'sharing_disabled', 'location_stale'];

export function generateMockDrivers(count: number = 50): Driver[] {
  const drivers: Driver[] = [];
  const now = Date.now();

  for (let i = 0; i < Math.min(count, driverNames.length); i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const coords = generateCoords(cityCenter, 0.15);
    const isOnline = status === 'online';
    const lastUpdated = isOnline
      ? now - Math.floor(Math.random() * 30000)
      : status === 'location_stale'
        ? now - Math.floor(Math.random() * 3600000)
        : now - Math.floor(Math.random() * 86400000);

    drivers.push({
      uid: `uid_${String(i + 1).padStart(3, '0')}`,
      name: driverNames[i],
      trackingId: `TRK-${String(i + 1).padStart(3, '0')}`,
      status,
      sharingEnabled: status !== 'sharing_disabled',
      latitude: coords.lat,
      longitude: coords.lng,
      speed: isOnline ? Math.floor(Math.random() * 80) + 10 : null,
      accuracy: isOnline ? Math.floor(Math.random() * 15) + 3 : null,
      lastUpdated,
      lastConnection: isOnline ? now - Math.floor(Math.random() * 10000) : lastUpdated,
      registeredAt: now - Math.floor(Math.random() * 2592000000) - 86400000,
    });
  }

  return drivers;
}

export const mockDrivers: Driver[] = generateMockDrivers(50);

export function getNextTrackingId(drivers: Driver[]): string {
  const maxNum = drivers.reduce((max, d) => {
    const num = parseInt(d.trackingId.replace('TRK-', ''));
    return num > max ? num : max;
  }, 0);
  return `TRK-${String(maxNum + 1).padStart(3, '0')}`;
}

export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
