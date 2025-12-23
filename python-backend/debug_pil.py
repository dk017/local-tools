
import sys
import os
from PIL import Image, ImageDraw, ImageFont

def test_watermark():
    try:
        # Create dummy image
        img = Image.new('RGB', (100, 100), color='red')
        
        # Test Font
        try:
            font = ImageFont.truetype("arial.ttf", 20)
            print("Font loaded successfully")
        except Exception as e:
            print(f"Font failed: {e}")
            font = ImageFont.load_default()

        # Test Draw
        draw = ImageDraw.Draw(img)
        text = "Test"
        
        # Test textsize (often deprecated)
        try:
            w, h = draw.textsize(text, font=font)
            print(f"textsize worked: {w}x{h}")
        except AttributeError:
            print("textsize failed (AttributeError), trying textbbox")
            bbox = draw.textbbox((0, 0), text, font=font)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            print(f"textbbox worked: {w}x{h}")
            
        print("Test complete")

    except Exception as e:
        print(f"General failure: {e}")

if __name__ == "__main__":
    test_watermark()
