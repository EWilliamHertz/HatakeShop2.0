import os
import re

# Classes to preserve unconditionally
preserve_classes = ['w-full', 'w-auto', 'md:w-auto', 'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-6', 'mt-8', 'mb-2', 'mb-4', 'mb-6', 'mr-2', 'mr-4', 'ml-2', 'ml-4', 'flex-1', 'mx-auto']

def clean_classes(match):
    original = match.group(1)
    classes = original.split()
    
    # Is it a button?
    is_primary = False
    is_secondary = False
    is_danger = False
    is_ghost = False

    if 'bg-cyan-500' in classes or 'bg-cyan-600' in classes or 'bg-ink' in classes or 'bg-[#635BFF]' in classes or ('bg-slate-900' in classes and 'text-white' in classes):
        is_primary = True
    elif 'bg-slate-800' in classes and 'border' in classes and not 'bg-slate-900' in classes:
        is_secondary = True
    elif 'bg-slate-700' in classes and 'border' not in classes:
        is_secondary = True
    elif 'bg-red-500' in classes or 'bg-rose-600' in classes or 'bg-red-600' in classes:
        is_danger = True
    elif 'hover:bg-slate-800' in classes and 'border' not in classes:
        is_ghost = True

    if not (is_primary or is_secondary or is_danger or is_ghost):
        return f'className="{original}"'
        
    # It's a button! We replace the aesthetic classes but keep layout ones.
    kept = [c for c in classes if c in preserve_classes]
    
    if is_primary:
        kept.insert(0, 'btn-primary')
    elif is_danger:
        kept.insert(0, 'btn-danger')
    elif is_secondary:
        kept.insert(0, 'btn-secondary')
    elif is_ghost:
        kept.insert(0, 'btn-ghost')
        
    return f'className="{" ".join(kept)}"'

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
                
            # Find <button className="..."> or <Link className="...">
            # Actually, just finding any className that looks like a button is risky if it's applied to a div card.
            # Let's ONLY replace inside <button> and <Link> tags!
            
            def replace_in_tag(tag_match):
                tag_content = tag_match.group(0)
                # Replace className inside this tag
                new_tag = re.sub(r'className="([^"]+)"', clean_classes, tag_content)
                return new_tag
                
            new_content = re.sub(r'<(button|Link)[^>]+className="[^"]+"[^>]*>', replace_in_tag, content)
            
            if new_content != content:
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Updated {path}")
