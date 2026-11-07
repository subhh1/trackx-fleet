from PIL import Image, ImageDraw
import os

def create_trackx_icon(size, output_path, is_maskable=False):
    # Create RGBA canvas
    img = Image.new("RGBA", (size, size), (10, 14, 23, 255)) # #0a0e17
    draw = ImageDraw.Draw(img)

    center = size // 2
    accent_color = (0, 212, 170, 255) # #00d4aa
    accent_faded1 = (0, 212, 170, 77)
    accent_faded2 = (0, 212, 170, 153)

    scale = size / 512.0
    pad = 0.8 if is_maskable else 1.0

    # Rounded background rect if not maskable
    if not is_maskable:
        corner_r = int(128 * scale)
        draw.rounded_rectangle([0, 0, size, size], radius=corner_r, fill=(10, 14, 23, 255))

    # Outer ring
    r_outer = int(140 * scale * pad)
    w_outer = max(2, int(24 * scale))
    draw.ellipse(
        [center - r_outer, center - r_outer, center + r_outer, center + r_outer],
        outline=accent_faded1,
        width=w_outer
    )

    # Middle ring
    r_mid = int(80 * scale * pad)
    w_mid = max(2, int(24 * scale))
    draw.ellipse(
        [center - r_mid, center - r_mid, center + r_mid, center + r_mid],
        outline=accent_faded2,
        width=w_mid
    )

    # Center dot
    r_center = int(32 * scale * pad)
    draw.ellipse(
        [center - r_center, center - r_center, center + r_center, center + r_center],
        fill=accent_color
    )

    # Crosshair ticks
    w_tick = max(2, int(24 * scale))
    t1 = int(96 * scale * pad)
    t2 = int(140 * scale * pad)
    t3 = int(372 * scale * pad)
    t4 = int(416 * scale * pad)

    draw.line([(center, t1), (center, t2)], fill=accent_color, width=w_tick)
    draw.line([(center, t3), (center, t4)], fill=accent_color, width=w_tick)
    draw.line([(t1, center), (t2, center)], fill=accent_color, width=w_tick)
    draw.line([(t3, center), (t4, center)], fill=accent_color, width=w_tick)

    img.save(output_path, "PNG")
    print(f"Generated: {output_path} ({size}x{size})")

os.makedirs("workspace/public", exist_ok=True)
create_trackx_icon(192, "workspace/public/icon-192.png")
create_trackx_icon(512, "workspace/public/icon-512.png")
create_trackx_icon(512, "workspace/public/icon-maskable-512.png", is_maskable=True)

