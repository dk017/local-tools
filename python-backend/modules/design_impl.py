
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
                            font_file = FONTS.get(font_name, "arial.ttf")
                            try:
                                font = ImageFont.truetype(font_file, font_size)
                            except:
                                font = ImageFont.load_default()

                            # Create text layer
                            # Use textbbox to get size
                            dummy_draw = ImageDraw.Draw(img)
                            bbox = dummy_draw.textbbox((0, 0), text, font=font)
                            w = bbox[2] - bbox[0]
                            h = bbox[3] - bbox[1]
                            
                            # Expand slightly to avoid clipping on rotation
                            txt_layer = Image.new("RGBA", (w + 20, h + 20), (0,0,0,0))
                            d = ImageDraw.Draw(txt_layer)
                            
                            # Parse hex color
                            if color.startswith("#"):
                                color = color.lstrip('#')
                                lv = len(color)
                                rgb = tuple(int(color[i:i + lv // 3], 16) for i in range(0, lv, lv // 3))
                                fill = rgb + (opacity,)
                            else:
                                fill = (0, 0, 0, opacity)

                            d.text((0, 0), text, font=font, fill=fill)
                            
                            # Rotation
                            if rotation != 0:
                                txt_layer = txt_layer.rotate(rotation, expand=True, resample=Image.BICUBIC)
                            
                            # Composite
                            img.alpha_composite(txt_layer, dest=(x, y))

                        elif l_type == "image":
                            # Image Layer (Watermark/Icon)
                            src = layer.get("src")
                            if src and os.path.exists(src):
                                with Image.open(src).convert("RGBA") as overlay:
                                    # Size logic
                                    # If width/height provided, resize
                                    width = layer.get("width")
                                    height = layer.get("height")
                                    
                                    if width and height:
                                        overlay = overlay.resize((int(width), int(height)), Image.Resampling.LANCZOS)
                                    
                                    # Opacity
                                    if opacity < 255:
                                        # Reduce opacity
                                        alpha = overlay.split()[3]
                                        alpha = ImageEnhance.Brightness(alpha).enhance(opacity / 255.0)
                                        overlay.putalpha(alpha)
                                    
                                    # Rotation
                                    if rotation != 0:
                                        overlay = overlay.rotate(rotation, expand=True, resample=Image.BICUBIC)
                                        
                                    img.alpha_composite(overlay, dest=(x, y))
                    
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
