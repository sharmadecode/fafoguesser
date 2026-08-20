import os
from PIL import Image, ImageDraw, ImageFont

def generate_assets():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "web", "public")
    os.makedirs(out_dir, exist_ok=True)

    # 1. Generate 1200x630 og-image.png
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), "#faf9f0")
    draw = ImageDraw.Draw(img)

    # Dot grid
    for x in range(20, W, 30):
        for y in range(20, H, 30):
            draw.ellipse([x, y, x + 3, y + 3], fill=(14, 17, 22, 28))

    # Outer border
    draw.rounded_rectangle([20, 20, W - 20, H - 20], radius=16, outline="#0e1116", width=8)

    # Badge: "⚡ FREE 360° MULTIPLAYER GAME"
    # Shadow
    draw.rounded_rectangle([74, 94, 464, 144], radius=8, fill="#0e1116")
    # Body
    draw.rounded_rectangle([70, 90, 460, 140], radius=8, fill="#4ade80", outline="#0e1116", width=4)

    try:
        font_large = ImageFont.truetype("arialbd.ttf", 72)
        font_sub = ImageFont.truetype("arial.ttf", 26)
        font_badge = ImageFont.truetype("arialbd.ttf", 16)
        font_pill = ImageFont.truetype("arialbd.ttf", 16)
    except:
        font_large = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_badge = ImageFont.load_default()
        font_pill = ImageFont.load_default()

    draw.text((265, 115), "⚡ FREE 360° MULTIPLAYER GAME", fill="#0e1116", font=font_badge, anchor="mm")

    # Title: FAFOGUESSER
    draw.text((70, 180), "FAFO", fill="#0e1116", font=font_large)
    # Calculate width of FAFO to place GUESSER
    fafo_bbox = draw.textbbox((70, 180), "FAFO", font=font_large)
    draw.text((fafo_bbox[2] + 8, 180), "GUESSER", fill="#4ade80", stroke_fill="#0e1116", stroke_width=3, font=font_large)

    # Subtitle
    draw.text((70, 290), "Figure it out or find out. Explore authentic 360° street view", fill="#0e1116", font=font_sub)
    draw.text((70, 330), "panoramas across 800+ worldwide regions with friends.", fill="#0e1116", font=font_sub)

    # Feature Pills
    pills = [
        ("🌍 800+ REGIONS", "#ffffff", 70),
        ("⚡ LIVE LOBBIES", "#fbbf24", 260),
        ("🎮 ZERO SIGN-UP", "#ffffff", 460),
    ]
    for text, fill_col, px in pills:
        draw.rounded_rectangle([px + 4, 414, px + 174, 464], radius=8, fill="#0e1116")
        draw.rounded_rectangle([px, 410, px + 170, 460], radius=8, fill=fill_col, outline="#0e1116", width=3)
        draw.text((px + 85, 435), text, fill="#0e1116", font=font_pill, anchor="mm")

    # Right Logo Illustration
    # Globe & Pin
    gx, gy = 940, 310
    gr = 140
    # Shadow
    draw.ellipse([gx - gr + 14, gy - gr + 14, gx + gr + 14, gy + gr + 14], fill="#0e1116")
    # Globe body
    draw.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill="#4ade80", outline="#0e1116", width=12)
    # Latitude lines
    draw.ellipse([gx - gr, gy - 45, gx + gr, gy + 45], outline="#0e1116", width=10)
    draw.line([gx - gr, gy, gx + gr, gy], fill="#0e1116", width=10)
    draw.line([gx, gy - gr, gx, gy + gr], fill="#0e1116", width=10)

    # Pin
    px, py = gx + 60, gy - 50
    # Pin polygon
    pin_pts = [
        (px, py - 90),
        (px + 70, py - 50),
        (px + 65, py + 10),
        (px, py + 110),
        (px - 65, py + 10),
        (px - 70, py - 50),
    ]
    # Pin shadow
    pin_shadow = [(x + 12, y + 12) for x, y in pin_pts]
    draw.polygon(pin_shadow, fill="#0e1116")
    draw.polygon(pin_pts, fill="#fbbf24", outline="#0e1116")
    # Thicken outline
    for i in range(len(pin_pts)):
        p1 = pin_pts[i]
        p2 = pin_pts[(i + 1) % len(pin_pts)]
        draw.line([p1, p2], fill="#0e1116", width=12)
    # Pin eye
    draw.ellipse([px - 26, py - 46, px + 26, py + 6], fill="#faf9f0", outline="#0e1116", width=10)

    img.save(os.path.join(out_dir, "og-image.png"), "PNG")
    print("Saved og-image.png")

    # 2. Generate Square App Icons (192, 512, apple-touch-icon 180)
    for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
        icon = Image.new("RGBA", (size, size), "#faf9f0")
        idraw = ImageDraw.Draw(icon)
        cx, cy = size // 2, size // 2
        r = int(size * 0.38)
        s_off = int(size * 0.04)
        stroke = max(3, int(size * 0.04))

        # Shadow
        idraw.ellipse([cx - r + s_off, cy - r + s_off, cx + r + s_off, cy + r + s_off], fill="#0e1116")
        # Globe
        idraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#4ade80", outline="#0e1116", width=stroke)
        idraw.ellipse([cx - r, cy - int(r * 0.4), cx + r, cy + int(r * 0.4)], outline="#0e1116", width=max(2, stroke - 2))
        idraw.line([cx - r, cy, cx + r, cy], fill="#0e1116", width=max(2, stroke - 2))
        idraw.line([cx, cy - r, cx, cy + r], fill="#0e1116", width=max(2, stroke - 2))

        # Pin
        ppx, ppy = cx + int(size * 0.12), cy - int(size * 0.1)
        pr = int(size * 0.22)
        pin_pts = [
            (ppx, ppy - pr),
            (ppx + int(pr * 0.8), ppy - int(pr * 0.4)),
            (ppx + int(pr * 0.6), ppy + int(pr * 0.2)),
            (ppx, ppy + int(pr * 1.2)),
            (ppx - int(pr * 0.6), ppy + int(pr * 0.2)),
            (ppx - int(pr * 0.8), ppy - int(pr * 0.4)),
        ]
        pin_shadow = [(x + s_off, y + s_off) for x, y in pin_pts]
        idraw.polygon(pin_shadow, fill="#0e1116")
        idraw.polygon(pin_pts, fill="#fbbf24")
        for i in range(len(pin_pts)):
            p1 = pin_pts[i]
            p2 = pin_pts[(i + 1) % len(pin_pts)]
            idraw.line([p1, p2], fill="#0e1116", width=stroke)
        idraw.ellipse([ppx - int(pr * 0.3), ppy - int(pr * 0.5), ppx + int(pr * 0.3), ppy + int(pr * 0.1)], fill="#faf9f0", outline="#0e1116", width=max(2, stroke - 2))

        icon.save(os.path.join(out_dir, name), "PNG")
        print(f"Saved {name}")

if __name__ == "__main__":
    generate_assets()
