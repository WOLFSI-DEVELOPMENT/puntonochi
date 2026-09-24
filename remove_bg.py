from PIL import Image

def remove_bg(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    q = [(0,0), (width-1, 0), (0, height-1), (width-1, height-1)]
    visited = set(q)
    
    while q:
        x, y = q.pop(0)
        
        r, g, b, a = pixels[x, y]
        
        # very dark / black
        if r < 30 and g < 30 and b < 30:
            pixels[x, y] = (0, 0, 0, 0)
            
            # check neighbors
            for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        q.append((nx, ny))

    img.save(output_path, "PNG")

remove_bg("public/icons/restaurantes.jpg", "public/icons/restaurantes.png")
remove_bg("public/icons/supermercados.jpg", "public/icons/supermercados.png")
