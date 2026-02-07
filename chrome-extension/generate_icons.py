from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    # Gradient-ish background (Emerald Green)
    img = Image.new('RGB', (size, size), color = (46, 125, 50)) 
    d = ImageDraw.Draw(img)
    
    # Add a border
    d.rectangle([0, 0, size-1, size-1], outline=(255,255,255), width=max(1, size//20))
    
    # Draw Text "LS"
    # Try to center it
    font_size = size // 2
    try:
        # distinct visual
        d.text((size//4, size//4), "LS", fill=(255, 255, 255))
    except:
        pass
        
    img.save(f"icons/{filename}")

if __name__ == "__main__":
    sizes = [(16, "icon16.png"), (48, "icon48.png"), (128, "icon128.png")]
    for size, filename in sizes:
        create_icon(size, filename)
        print(f"Created {filename}")
