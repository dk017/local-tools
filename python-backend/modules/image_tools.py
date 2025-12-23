import os
import logging
import traceback
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance, ImageFilter
from pillow_heif import register_heif_opener
register_heif_opener()
import io

# Setup module-level logger
logger = logging.getLogger(__name__)

try:
    from modules.security import validate_input_file
except ImportError:
    from security import validate_input_file

# PREVENT DECOMPRESSION BOMBS
# 100M pixels = approx 10k x 10k image. Adjust as needed.
Image.MAX_IMAGE_PIXELS = 100_000_000

def handle_image_action(action, payload):
    logger.info(f"Handling image action: {action}")
    
    # Security Check
    files = payload.get("files", [])
    for f in files:
        if isinstance(f, str):
            validate_input_file(f)
            
    wm_file = payload.get("watermark_file")
    if wm_file and isinstance(wm_file, str):
        validate_input_file(wm_file)

    if action == "convert":
        return convert_images(payload)
    elif action == "resize":
        return resize_images(payload)
    elif action == "compress":
        return compress_images(payload)
    elif action == "passport":
        return create_passport_photos(payload)
    elif action == "remove_metadata":
        return remove_metadata(payload)
    elif action == "watermark":
        return watermark_images(payload)
    elif action == "grid_split":
        return grid_split(payload)
    elif action == "generate_icons":
        return generate_icons(payload)
    elif action == "extract_palette":
        return extract_palette(payload)
    elif action == "crop":
        return crop_images(payload)
    elif action == "design":
        return design_images(payload)
    elif action == "remove_bg":
        return remove_background(payload)
    elif action == "heic_to_jpg":
        return heic_to_jpg(payload)
    else:
        raise ValueError(f"Unknown action: {action}")

def convert_images(payload):
    files = payload.get("files", [])
    target_format = payload.get("target_format", "png").lower()
    processed_files = []
    errors = []
    
    # Map common format aliases
    format_map = {
        'jpg': 'JPEG',
        'jpeg': 'JPEG',
        'png': 'PNG',
        'webp': 'WEBP',
        'bmp': 'BMP',
        'ico': 'ICO',
        'pdf': 'PDF'
    }
    
    pil_format = format_map.get(target_format, target_format.upper())
    
    for file_path in files:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            with Image.open(file_path) as img:
                # Convert mode if necessary
                # JPEG doesn't support transparency
                if pil_format == 'JPEG' and img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                elif pil_format == 'PDF':
                    # PDF conversion often prefers RGB, though some support exists for others
                    # Standardizing on RGB helps avoid errors
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                elif pil_format == 'ICO':
                     if img.mode == 'P': img = img.convert('RGBA')
                
                base, _ = os.path.splitext(file_path)
                output_path = f"{base}.{target_format}"
                
                if output_path == file_path:
                    output_path = f"{base}_converted.{target_format}"
                
                img.save(output_path, format=pil_format)
                processed_files.append(output_path)
                
        except Exception as e:
            logger.error(f"Error converting {file_path}: {e}")
            errors.append({"file": file_path, "error": str(e)})
            
    return {"processed_files": processed_files, "errors": errors}

def resize_images(payload):
    files = payload.get("files", [])
    width = payload.get("width")
    height = payload.get("height")
    percentage = payload.get("percentage")
    maintain_aspect = payload.get("maintain_aspect", True)
    
    processed_files = []
    errors = []

    for file_path in files:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            with Image.open(file_path) as img:
                original_w, original_h = img.size
                new_w, new_h = original_w, original_h

                if percentage:
                    factor = percentage / 100.0
                    new_w = int(original_w * factor)
                    new_h = int(original_h * factor)
                else:
                    if width and height:
                        if maintain_aspect:
                            # If both provided with aspect, fit within box
                            img.thumbnail((width, height), Image.Resampling.LANCZOS)
                            # thumbnail modifies in place and preserves aspect
                            new_w, new_h = img.size
                            # We don't need to resize again if we used thumbnail
                        else:
                            new_w, new_h = width, height
                    elif width:
                        new_w = width
                        if maintain_aspect:
                            ratio = width / original_w
                            new_h = int(original_h * ratio)
                    elif height:
                        new_h = height
                        if maintain_aspect:
                            ratio = height / original_h
                            new_w = int(original_w * ratio)

                # Perform resize if we didn't use thumbnail
                if (new_w, new_h) != img.size:
                    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

                base, ext = os.path.splitext(file_path)
                output_path = f"{base}_resized{ext}"
                
                img.save(output_path)
                processed_files.append(output_path)

        except Exception as e:
            logger.error(f"Error resizing {file_path}: {e}")
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def compress_images(payload):
    files = payload.get("files", [])
    quality = payload.get("quality", 80) # 1-100
    if quality is None:
        quality = 80
    target_size_kb = payload.get("target_size_kb") # Optional target size in KB

    processed_files = []
    errors = []

    import io

    for file_path in files:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            with Image.open(file_path) as img:
                # Handle rotation if needed
                try:
                    img = ImageOps.exif_transpose(img)
                except:
                    pass
                
                # Convert RGBA to RGB if saving as JPEG, otherwise keep
                input_format = img.format
                if not input_format:
                    input_format = "JPEG"
                
                base, ext = os.path.splitext(file_path)
                ext_lower = ext.lower().replace('.', '')
                
                # Default output format
                save_format = input_format
                if ext_lower in ['jpg', 'jpeg']:
                    save_format = 'JPEG'
                    if img.mode == 'RGBA':
                        img = img.convert('RGB')
                elif ext_lower == 'png':
                    save_format = 'PNG'
                elif ext_lower == 'webp':
                    save_format = 'WEBP'
                
                output_path = f"{base}_compressed{ext}"

                # Get initial size
                initial_size = os.path.getsize(file_path)
                logger.info(f"Compressing {file_path}. Initial Size: {initial_size} bytes. Format: {save_format}")

                if target_size_kb:
                    target_bytes = target_size_kb * 1024
                    
                    if save_format == 'PNG':
                        # PNG Strategy: Reduce colors (Quantize)
                        # We try to reduce colors until it fits
                        colors = 256
                        best_img = img
                        
                        while colors >= 16:
                            buf = io.BytesIO()
                            temp_img = img.quantize(colors=colors, method=2)
                            temp_img.save(buf, format=save_format, optimize=True)
                            if buf.tell() <= target_bytes:
                                best_img = temp_img
                                break
                            colors //= 2
                            
                        best_img.save(output_path, format=save_format, optimize=True)
                        
                    else:
                        # JPEG/WEBP Strategy: Binary search quality
                        min_q = 5
                        max_q = 100
                        best_q = 5 # Default fallback
                        
                        while min_q <= max_q:
                            curr_q = (min_q + max_q) // 2
                            buf = io.BytesIO()
                            img.save(buf, format=save_format, quality=curr_q, optimize=True)
                            size = buf.tell()
                            
                            if size <= target_bytes:
                                best_q = curr_q
                                min_q = curr_q + 1 # Try higher quality if it fits
                            else:
                                max_q = curr_q - 1 # Needs lower quality
                                
                        img.save(output_path, format=save_format, quality=best_q, optimize=True)

                else:
                    # Level-based / Fixed Quality
                    level = payload.get("level")
                    if level is not None:
                        try:
                            level = int(level)
                            if level == 0: quality = 90 # Low compression
                            elif level == 1: quality = 75 # Medium
                            elif level == 2: quality = 30 # High compression (Aggressive)
                        except:
                            pass
                    
                    if save_format == 'PNG':
                        # PNG Quantization Strategy
                        colors = 256
                        if quality <= 80: colors = 128
                        if quality <= 40: colors = 32
                        
                        logger.info(f"PNG Compression. Quality:{quality} -> Colors:{colors}")
                        img = img.quantize(colors=colors, method=2)
                        img.save(output_path, format=save_format, optimize=True)
                    else:
                        # JPEG/WEBP
                        logger.info(f"JPEG/WEBP Compression. Quality: {quality}")
                        img.save(output_path, format=save_format, quality=quality, optimize=True)

                final_size = os.path.exists(output_path) and os.path.getsize(output_path) or 0
                logger.info(f"Compressed {file_path}. Final Size: {final_size} bytes.")
                processed_files.append(output_path)
                
        except Exception as e:
            logger.error(f"Error compressing {file_path}: {e}")
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}



def create_passport_photos(payload):
    files = payload.get("files", [])
    country = payload.get("country", "US")
    crop_box = payload.get("crop_box") # Expected format: {file_path: {x, y, width, height}} or single dict if 1 file
    
    # Standards (dimensions in mm)
    # 300 DPI constants
    DPI = 300
    MM_TO_INCH = 0.0393701
    
    standards = {
        "US": {"w_mm": 51, "h_mm": 51, "name": "US 2x2 inch"}, # 2x2 inches
        "UK": {"w_mm": 35, "h_mm": 45, "name": "UK/EU 35x45mm"},
        "EU": {"w_mm": 35, "h_mm": 45, "name": "UK/EU 35x45mm"},
        "AU": {"w_mm": 35, "h_mm": 45, "name": "Australia 35x45mm"},
        "JP": {"w_mm": 35, "h_mm": 45, "name": "Japan 35x45mm"},
        "CN": {"w_mm": 33, "h_mm": 48, "name": "China 33x48mm"},
        "IN": {"w_mm": 35, "h_mm": 45, "name": "India 35x45mm"},
        "CA": {"w_mm": 50, "h_mm": 70, "name": "Canada 50x70mm"},
    }
    
    spec = standards.get(country, standards["US"])
    
    # Calculate target pixels
    target_w_px = int(spec["w_mm"] * MM_TO_INCH * DPI)
    target_h_px = int(spec["h_mm"] * MM_TO_INCH * DPI)
    
    processed_files = []
    errors = []

    for file_path in files:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File path not found: {file_path}")
                
            with Image.open(file_path) as img:
                # Handle Orientation from Exif
                try:
                    img = ImageOps.exif_transpose(img)
                except:
                    pass

                # 1. Crop if coordinates provided
                working_img = img.convert("RGB")
                
                current_crop = None
                if isinstance(crop_box, dict):
                    # Check if it has file keys or just x,y
                    if 'x' in crop_box:
                        current_crop = crop_box
                    elif file_path in crop_box:
                        current_crop = crop_box[file_path]
                
                if current_crop:
                    # Crop coordinates from frontend
                    # Use safe extraction to avoid int(None) errors
                    def safe_int(val, default=0):
                        try:
                            if val is None: return default
                            return int(float(val))
                        except (ValueError, TypeError):
                            return default

                    x = safe_int(current_crop.get('x'), 0)
                    y = safe_int(current_crop.get('y'), 0)
                    w = safe_int(current_crop.get('width'), working_img.width)
                    h = safe_int(current_crop.get('height'), working_img.height)
                    
                    # Ensure dimensions are valid
                    if w <= 0: w = working_img.width
                    if h <= 0: h = working_img.height
                    
                    working_img = working_img.crop((x, y, x + w, y + h))
                else:
                    # Auto-center crop to aspect ratio
                    img_ratio = working_img.width / working_img.height
                    target_ratio = target_w_px / target_h_px
                    
                    if img_ratio > target_ratio:
                        # Image is wider than target
                        new_width = int(working_img.height * target_ratio)
                        offset = (working_img.width - new_width) // 2
                        working_img = working_img.crop((offset, 0, offset + new_width, working_img.height))
                    else:
                        # Image is taller than target
                        new_height = int(working_img.width / target_ratio)
                        offset = (working_img.height - new_height) // 2
                        working_img = working_img.crop((0, offset, working_img.width, offset + new_height))
                        
                # 2. Resize to specific high-res Photo dimensions
                single_photo = working_img.resize((target_w_px, target_h_px), Image.Resampling.LANCZOS)
                
                # Save Single Photo
                base, ext = os.path.splitext(file_path)
                single_out = f"{base}_{country}_passport.jpg" # Always JPG for print usually
                single_photo.save(single_out, quality=95, dpi=(DPI, DPI))
                processed_files.append(single_out)
                
                # Sheet generation removed as per user request


        except Exception as e:
            tb = traceback.format_exc()
            logger.error(f"Error creating passport photo for {file_path}: {e}\n{tb}")
            errors.append({"file": file_path, "error": str(e), "traceback": tb})

    return {"processed_files": processed_files, "errors": errors}

def remove_metadata(payload):
    files = payload.get("files", [])
    processed_files = []
    errors = []

    for file_path in files:
        try:
            with Image.open(file_path) as img:
                data = list(img.getdata())
                # Create a new image without metadata
                clean_img = Image.new(img.mode, img.size)
                clean_img.putdata(data)
                
                base, ext = os.path.splitext(file_path)
                output_path = f"{base}_clean{ext}"
                
                # Save without extra info
                clean_img.save(output_path)
                processed_files.append(output_path)
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def watermark_images(payload):
    files = payload.get("files", [])
    
    # Text Settings
    text = payload.get("text", "Watermark")
    # Opacity from frontend is 0.0-1.0, PIL needs 0-255
    opacity_float = payload.get("opacity")
    if opacity_float is None: opacity_float = 0.5
    else: opacity_float = float(opacity_float)
    opacity = int(opacity_float * 255)
    
    text_size_percent = payload.get("size", 10) # size of text/image relative to main image height
    # We can use font_size param if provided, otherwise fallback to percentage logic
    font_size_param = payload.get("font_size")
    
    color_hex = payload.get("color")
    if not color_hex: color_hex = "#FFFFFF"

    # Image Settings
    watermark_file = payload.get("watermark_file") 
    if isinstance(watermark_file, list) and len(watermark_file) > 0:
        watermark_file = watermark_file[0]
    
    # Position
    position = payload.get("position", "center")
    
    processed_files = []
    errors = []

    # Helper to convert hex to rgb
    def hex_to_rgb(h):
        try:
            h = h.lstrip('#')
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        except:
            return (255, 255, 255) # Fallback to white
    
    text_color_rgb = hex_to_rgb(color_hex)

    for file_path in files:
        try:
            with Image.open(file_path).convert("RGBA") as img:
                # Create a transparent layer for the watermark
                watermark_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
                
                wm_width, wm_height = 0, 0
                wm_content = None # For image watermark
                font = None # For text watermark
                
                # --- Prepare Watermark Content ---
                if watermark_file and isinstance(watermark_file, str) and os.path.exists(watermark_file):
                    # Image Watermark
                    with Image.open(watermark_file).convert("RGBA") as wm_img:
                        # Resize watermark logic
                        # If font_size_param is provided, treat it as percentage (10-100)
                        scale_percent = 15 # Default 15%
                        if font_size_param:
                            try:
                                val = float(font_size_param)
                                if val > 0: scale_percent = val
                            except: pass
                        
                        target_h = int(img.height * (scale_percent / 100))
                        # Min size constraint
                        if target_h < 20: target_h = 20
                        
                        aspect = wm_img.width / wm_img.height
                        target_w = int(target_h * aspect)
                        
                        wm_content = wm_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                        
                        # Apply opacity to image
                        if opacity < 255:
                            # Get alpha channel
                            r, g, b, a_channel = wm_content.split()
                            # Apply factor
                            alpha_factor = opacity / 255.0
                            a_channel = a_channel.point(lambda p: int(p * alpha_factor))
                            wm_content.putalpha(a_channel)
                            
                        wm_width, wm_height = wm_content.size
                else:
                    # Text Watermark
                    draw_dummy = ImageDraw.Draw(watermark_layer)
                    
                    if font_size_param:
                         fontsize = int(font_size_param)
                    else:
                         fontsize = int(img.height * (text_size_percent / 100))
                         
                    if fontsize < 10: fontsize = 10
                    
                    try:
                        font = ImageFont.truetype("arial.ttf", fontsize)
                    except:
                        try:
                            # Try generic naming for linux/mac if needed, or fallback
                            font = ImageFont.truetype("Arial", fontsize)
                        except:
                            font = ImageFont.load_default()
                        
                    # Calculate text size using textbbox (Fixes AttributeError)
                    try:
                         bbox = draw_dummy.textbbox((0, 0), text, font=font)
                         wm_width = bbox[2] - bbox[0]
                         wm_height = bbox[3] - bbox[1]
                    except AttributeError:
                         # Fallback for very old Pillow if somehow present
                         w, h = draw_dummy.textsize(text, font=font)
                         wm_width, wm_height = w, h
                    
                # --- Calculate Position ---
                margin = 20
                
                if position == "custom":
                    # Custom Logic (Percent 0-1)
                    try:
                        percent_x = float(payload.get("x", 0.5))
                        percent_y = float(payload.get("y", 0.5))
                        draw_x = int(img.width * percent_x)
                        draw_y = int(img.height * percent_y)
                    except:
                        draw_x = (img.width - wm_width) // 2
                        draw_y = (img.height - wm_height) // 2
                elif position == "top-left":
                    draw_x = margin
                    draw_y = margin
                elif position == "top-center":
                    draw_x = (img.width - wm_width) // 2
                    draw_y = margin
                elif position == "top-right":
                    draw_x = img.width - wm_width - margin
                    draw_y = margin
                elif position == "bottom-left":
                    draw_x = margin
                    draw_y = img.height - wm_height - margin
                elif position == "bottom-center":
                    draw_x = (img.width - wm_width) // 2
                    draw_y = img.height - wm_height - margin
                elif position == "bottom-right":
                    draw_x = img.width - wm_width - margin
                    draw_y = img.height - wm_height - margin
                else:
                    # Center
                    draw_x = (img.width - wm_width) // 2
                    draw_y = (img.height - wm_height) // 2
                    
                # --- Apply Watermark ---
                if wm_content:
                     # Paste Image
                     watermark_layer.paste(wm_content, (draw_x, draw_y))
                else:
                     # Draw Text
                     draw = ImageDraw.Draw(watermark_layer)
                     draw.text((draw_x, draw_y), text, fill=text_color_rgb + (opacity,), font=font)
                
                # Composite
                out = Image.alpha_composite(img, watermark_layer)
                
                base, ext = os.path.splitext(file_path)
                output_path = f"{base}_watermarked.png"
                
                if ext.lower() in ['.jpg', '.jpeg']:
                    out = out.convert("RGB")
                    output_path = f"{base}_watermarked.jpg" 
                
                out.save(output_path)
                processed_files.append(output_path)
                
        except Exception as e:
            logger.error(f"Error watermarking {file_path}: {e}")
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def grid_split(payload):
    files = payload.get("files", [])
    rows = payload.get("rows", 3)
    cols = payload.get("cols", 3)
    
    processed_files = []
    errors = []

    for file_path in files:
        try:
            with Image.open(file_path) as img:
                w, h = img.size
                piece_w = w // cols
                piece_h = h // rows
                
                base, ext = os.path.splitext(file_path)
                
                for r in range(rows):
                    for c in range(cols):
                        left = c * piece_w
                        upper = r * piece_h
                        right = left + piece_w
                        lower = upper + piece_h
                        
                        piece = img.crop((left, upper, right, lower))
                        out_path = f"{base}_grid_{r}_{c}{ext}"
                        piece.save(out_path)
                        processed_files.append(out_path)
                        
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def generate_icons(payload):
    files = payload.get("files", [])
    sizes = payload.get("sizes", [16, 32, 64, 128, 512, 1024])
    
    processed_files = []
    errors = []

    for file_path in files:
        try:
            with Image.open(file_path) as img:
                # Ensure square
                size = min(img.size)
                # Center crop to square
                left = (img.width - size) / 2
                top = (img.height - size) / 2
                right = (img.width + size) / 2
                bottom = (img.height + size) / 2
                img = img.crop((left, top, right, bottom))
                
                base, ext = os.path.splitext(file_path)
                
                for s in sizes:
                    resized = img.resize((s, s), Image.Resampling.LANCZOS)
                    out_path = f"{base}_icon_{s}x{s}{ext}"
                    resized.save(out_path)
                    processed_files.append(out_path)
                    
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def extract_palette(payload):
    files = payload.get("files", [])
    count = payload.get("count", 5)
    if count is None: count = 5
    results = {}
    results = {}
    errors = []

    for file_path in files:
        try:
            with Image.open(file_path) as img:
                # Resize to speed up
                img.thumbnail((150, 150))
                # Reduce to 'count' colors
                img = img.convert("P", palette=Image.Palette.ADAPTIVE, colors=count)
                palette = img.getpalette() # [r,g,b, r,g,b, ...]
                
                colors = []
                for i in range(count):
                    r = palette[i*3]
                    g = palette[i*3+1]
                    b = palette[i*3+2]
                    hex_code = '#{:02x}{:02x}{:02x}'.format(r, g, b)
                    colors.append({"rgb": [r, g, b], "hex": hex_code})
                    
                results[file_path] = colors
                
        except Exception as e:
            errors.append({"file": file_path, "error": str(e)})

    # 'extract_palette' returns data, not just files
    return {"data": results, "processed_files": [], "errors": errors}

def crop_images(payload):
    files = payload.get('files', [])
    crop_box = payload.get('crop_box') # {x, y, width, height} or {file_path: box}
    
    processed_files = []
    errors = []

    for file_path in files:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f'File not found: {file_path}')
            
            with Image.open(file_path) as img:
                # Handle Orientation
                try:
                    img = ImageOps.exif_transpose(img)
                except:
                    pass

                # Resolve crop box
                crop_box = payload.get("crop_box")
                print(f"DEBUG: image_tools crop_box: {crop_box}")
                current_crop = None
                if isinstance(crop_box, dict):
                    if 'x' in crop_box or 'width' in crop_box or 'height' in crop_box:
                        current_crop = crop_box
                    elif file_path in crop_box:
                        current_crop = crop_box[file_path]
                
                if not current_crop:
                    # No crop defined - Fallback to full image
                    print(f"WARNING: No crop coordinates provided for {file_path}, using full image.")
                    current_crop = {'x': 0, 'y': 0, 'width': img.width, 'height': img.height}

                def safe_int(val, default=0):
                    try:
                        if val is None: return default
                        return int(float(val))
                    except (ValueError, TypeError):
                        return default

                x = safe_int(current_crop.get('x'), 0)
                y = safe_int(current_crop.get('y'), 0)
                w = safe_int(current_crop.get('width'), img.width)
                h = safe_int(current_crop.get('height'), img.height)
                
                # Check bounds
                if w <= 0: w = 1
                if h <= 0: h = 1
                
                # Perform Crop
                cropped = img.crop((x, y, x + w, y + h))
                
                base, ext = os.path.splitext(file_path)
                output_path = f'{base}_cropped{ext}'
                
                # Save
                # Use format from original if possible
                save_fmt = img.format if img.format else 'PNG'
                cropped.save(output_path, format=save_fmt)
                processed_files.append(output_path)
                
        except Exception as e:
            logger.error(f'Error cropping {file_path}: {e}')
            errors.append({'file': file_path, 'error': str(e)})

    return {'processed_files': processed_files, 'errors': errors}

def design_images(payload):
    files = payload.get("files", [])
    layers = payload.get("layers", []) # List of {type, x, y, content, ...}
    
    # Available Fonts Map (Windows defaults for now)
    FONTS = {
        "arial": "arial.ttf",
        "times": "times.ttf",
        "courier": "cour.ttf",
        "impact": "impact.ttf",
        "comic": "comic.ttf",
        "georgia": "georgia.ttf",
        "trebuchet": "trebuc.ttf",
        "verdana": "verdana.ttf",
        "segoe": "seguisb.ttf",
        "calibri": "calibri.ttf",
    }
    
    processed_files = []
    errors = []

    for file_path in files:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            with Image.open(file_path) as img:
                # Working in RGBA for transparency
                img = img.convert("RGBA")
                
                # Apply layers
                for layer in layers:
                    try:
                        l_type = layer.get("type")
                        x = int(float(layer.get("x", 0)))
                        y = int(float(layer.get("y", 0)))
                        opacity = int(float(layer.get("opacity", 1)) * 255)
                        rotation = float(layer.get("rotation", 0))
                        
                        if l_type == "text":
                            text = layer.get("text", "")
                            font_name = layer.get("font", "arial").lower()
                            font_size = int(float(layer.get("fontSize", 40)))
                            color = layer.get("color", "#000000") 
                            
                            # Resolve Font
                            font_filename = FONTS.get(font_name, "arial.ttf")
                            
                            # Try to locate font
                            font_path = font_filename
                            system_font_dir = "C:/Windows/Fonts/"
                            
                            # Check system dir if not simplified path
                            if not os.path.exists(font_path) and os.path.exists(os.path.join(system_font_dir, font_filename)):
                                font_path = os.path.join(system_font_dir, font_filename)
                            
                            try:
                                # Start with exact size provided
                                font = ImageFont.truetype(font_path, font_size)
                            except OSError:
                                # Fallback to Arial if specific font failed
                                try:
                                    fallback = os.path.join(system_font_dir, "arial.ttf")
                                    font = ImageFont.truetype(fallback, font_size)
                                except:
                                    # Last resort
                                    font = ImageFont.load_default()

                            # Create text layer
                            # Use textbbox to get size
                            dummy_draw = ImageDraw.Draw(img)
                            # Get bounding box with default anchor to determine size needed
                            bbox = dummy_draw.textbbox((0, 0), text, font=font)
                            w = bbox[2] - bbox[0]
                            h = bbox[3] - bbox[1]
                            
                            # Expand slightly to avoid clipping 
                            # Adding some padding for rendering
                            pad_x = 20
                            pad_y = 20
                            
                            layer_w = w + pad_x * 2
                            layer_h = h + pad_y * 2
                            
                            txt_layer = Image.new("RGBA", (layer_w, layer_h), (0,0,0,0))
                            d = ImageDraw.Draw(txt_layer)
                            
                            # Parse hex color
                            if color.startswith("#"):
                                color = color.lstrip('#')
                                lv = len(color)
                                rgb = tuple(int(color[i:i + lv // 3], 16) for i in range(0, lv, lv // 3))
                                fill = rgb + (opacity,)
                            else:
                                fill = (0, 0, 0, opacity)

                            # Draw text CENTERED in the layer
                            # anchor="mm" aligns the text middle-horizontal and middle-vertical to the point
                            cx = layer_w / 2
                            cy = layer_h / 2
                            d.text((cx, cy), text, font=font, fill=fill, anchor="mm")
                            
                            # Rotation
                            if rotation != 0:
                                txt_layer = txt_layer.rotate(-rotation, expand=True, resample=Image.BICUBIC)
                            
                            # "x" and "y" from frontend are CENTER coordinates.
                            # PIL alpha_composite takes top-left coordinates.
                            layer_w, layer_h = txt_layer.size
                            dest_x = x - (layer_w // 2)
                            dest_y = y - (layer_h // 2)
                            
                            # Composite
                            img.alpha_composite(txt_layer, dest=(dest_x, dest_y))

                        elif l_type == "image":
                            # Image Layer (Watermark/Icon)
                            src = layer.get("src")
                            if src and os.path.exists(src):
                                with Image.open(src).convert("RGBA") as overlay:
                                    # Size logic
                                    width = layer.get("width")
                                    height = layer.get("height")
                                    
                                    if width and height:
                                        overlay = overlay.resize((int(float(width)), int(float(height))), Image.Resampling.LANCZOS)
                                    
                                    # Opacity
                                    if opacity < 255:
                                        alpha = overlay.split()[3]
                                        alpha = ImageEnhance.Brightness(alpha).enhance(opacity / 255.0)
                                        overlay.putalpha(alpha)
                                    
                                    # Rotation
                                    if rotation != 0:
                                        overlay = overlay.rotate(-rotation, expand=True, resample=Image.BICUBIC)
                                        
                                    layer_w, layer_h = overlay.size
                                    dest_x = x - (layer_w // 2)
                                    dest_y = y - (layer_h // 2)
                                    
                                    img.alpha_composite(overlay, dest=(dest_x, dest_y))
                    
                    except Exception as le:
                        logger.error(f"Error processing layer {layer}: {le}")
                        continue
                        
                # Save Result
                base, ext = os.path.splitext(file_path)
                output_path = f"{base}_studio.png" # Force PNG mostly
                
                if ext.lower() in ['.jpg', '.jpeg']:
                    img = img.convert("RGB")
                    output_path = f"{base}_studio.jpg"
                
                img.save(output_path)
                processed_files.append(output_path)

        except Exception as e:
            logger.error(f"Error designing {file_path}: {e}")
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}

def remove_background(payload):
    try:
        from rembg import remove, new_session
    except ImportError:
        return {"processed_files": [], "errors": ["rembg module not allowed or missing."]}

    files = payload.get("files", [])
    model_name = payload.get("model", "u2net") # u2net (general), u2netp (lightweight), u2net_human_seg (human)
    
    processed_files = []
    errors = []
    
    # Pre-initialize session
    try:
        session = new_session(model_name)
    except Exception as e:
        logger.error(f"Failed to load rembg model {model_name}: {e}")
        return {"processed_files": [], "errors": [f"Model load error: {str(e)}. Internet required for first run."]}

    for file_path in files:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            with open(file_path, 'rb') as i:
                input_data = i.read()
                # Run rembg
                output_data = remove(input_data, session=session)
                
            base, ext = os.path.splitext(file_path)
            output_path = f"{base}_nobg.png" # Always PNG for transparency
            
            with open(output_path, 'wb') as o:
                o.write(output_data)
                
            processed_files.append(output_path)
            
        except Exception as e:
            logger.error(f"Error removing bg for {file_path}: {e}")
            errors.append({"file": file_path, "error": str(e)})

    return {"processed_files": processed_files, "errors": errors}


def heic_to_jpg(payload):
    files = payload.get("files", [])
    quality = int(payload.get("quality", 95))
    
    processed_files = []
    errors = []
    
    for file_path in files:
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # pillow_heif acts as a plugin, so Image.open handles .heic now
            with Image.open(file_path) as img:
                # To save as JPG, we must ensure RGB mode
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                base, _ = os.path.splitext(file_path)
                output_path = f"{base}.jpg"
                
                # Careful not to overwrite if user named it .jpg already (unlikely for input heic)
                if output_path == file_path:
                    output_path = f"{base}_converted.jpg"
                
                # Save with quality. Keep EXIF is automatic in Pillow if present in .info
                exif = img.info.get("exif")
                
                if exif:
                    img.save(output_path, "JPEG", quality=quality, exif=exif)
                else:
                    img.save(output_path, "JPEG", quality=quality)
                
                processed_files.append(output_path)
                
        except Exception as e:
            logger.error(f"HEIC Conversion Error: {e}")
            errors.append({"file": file_path, "error": str(e)})
            
    return {"processed_files": processed_files, "errors": errors}
