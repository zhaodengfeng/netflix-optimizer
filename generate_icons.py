#!/usr/bin/env python3
"""Generate Netflix-style icons for the Chrome extension"""

from PIL import Image, ImageDraw
import os

# Netflix brand colors
NETFLIX_RED = '#E50914'
NETFLIX_RED_DARK = '#B20710'  # Darker red for shadow
NETFLIX_RED_LIGHT = '#FF0A17'  # Lighter red for highlight
BACKGROUND = (0, 0, 0, 0)  # Transparent background

def create_netflix_n(size):
    """Create a Netflix-style 'N' ribbon icon"""
    img = Image.new('RGBA', (size, size), BACKGROUND)
    draw = ImageDraw.Draw(img)
    
    # Calculate dimensions based on size
    margin = int(size * 0.15)
    width = size - 2 * margin
    stroke_width = int(width * 0.25)
    
    # Points for the N ribbon
    # Left vertical bar
    left_x = margin
    right_x = size - margin
    top_y = margin
    bottom_y = size - margin
    
    # Create the ribbon-style N with 3D effect
    # Left vertical stroke
    left_rect = [left_x, top_y, left_x + stroke_width, bottom_y]
    
    # Right vertical stroke
    right_rect = [right_x - stroke_width, top_y, right_x, bottom_y]
    
    # Diagonal stroke (from bottom-left to top-right)
    diagonal_points = [
        (left_x, bottom_y),
        (left_x + stroke_width, bottom_y),
        (right_x, top_y),
        (right_x - stroke_width, top_y)
    ]
    
    # Draw shadow layer first (darker)
    shadow_offset = int(size * 0.02)
    
    # Draw the N with ribbon effect
    # Left bar
    draw.rectangle(left_rect, fill=NETFLIX_RED)
    
    # Right bar
    draw.rectangle(right_rect, fill=NETFLIX_RED)
    
    # Diagonal bar
    draw.polygon(diagonal_points, fill=NETFLIX_RED)
    
    # Add subtle shadow on the diagonal overlap
    # The diagonal goes OVER the left bar and UNDER the right bar
    shadow_diagonal = [
        (left_x + stroke_width * 0.3, bottom_y),
        (left_x + stroke_width * 1.3, bottom_y),
        (right_x - stroke_width * 0.7, top_y),
        (right_x - stroke_width * 1.7, top_y)
    ]
    draw.polygon(shadow_diagonal, fill=NETFLIX_RED_DARK)
    
    # Add highlight on top edges for 3D effect
    highlight_points = [
        (left_x, top_y),
        (left_x + stroke_width, top_y),
        (left_x + stroke_width * 1.5, top_y + stroke_width * 0.3),
        (left_x + stroke_width * 0.5, top_y + stroke_width * 0.3)
    ]
    draw.polygon(highlight_points, fill=NETFLIX_RED_LIGHT)
    
    return img

def main():
    output_dir = os.path.join(os.path.dirname(__file__), 'img')
    os.makedirs(output_dir, exist_ok=True)
    
    sizes = [16, 48, 128]
    
    for size in sizes:
        icon = create_netflix_n(size)
        icon_path = os.path.join(output_dir, f'icon{size}.png')
        icon.save(icon_path, 'PNG')
        print(f'Created {icon_path}')
    
    print('All icons generated successfully!')

if __name__ == '__main__':
    main()
