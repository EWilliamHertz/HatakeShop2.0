import re
import sys

def transform(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Generic theme replacements
    content = content.replace('text-ink-light', 'text-slate-400')
    content = content.replace('text-ink', 'text-slate-100')
    content = content.replace('bg-canvas', 'bg-slate-900')
    content = content.replace('bg-surface-hover', 'bg-slate-700')
    content = content.replace('bg-surface', 'bg-slate-800')
    content = content.replace('border-hairline', 'border-slate-700')
    
    # "panel" usually implies some border, bg, rounded corners.
    # We will replace panel with dark panel classes
    content = content.replace('className="panel', 'className="bg-slate-800 border border-slate-700 rounded-2xl')
    content = content.replace(' panel ', ' bg-slate-800 border border-slate-700 rounded-2xl ')
    
    # Specifics in the Sponsored Products
    content = content.replace('bg-white shadow-sm', 'bg-slate-800 shadow-md border-slate-700')
    content = content.replace('bg-white/90', 'bg-slate-800/90')
    
    # Update heading classes to dark versions
    content = content.replace('heading-lg', 'text-3xl font-extrabold text-white')
    content = content.replace('heading-md', 'text-2xl font-bold text-white')

    # Accent color updates (from indigo to cyan/yellow for the premium theme)
    content = content.replace('text-indigo-400/70', 'text-cyan-500/70')
    content = content.replace('group-hover:text-indigo-500', 'group-hover:text-cyan-400')
    content = content.replace('group-hover:text-accent', 'group-hover:text-[#ffcc00]')
    content = content.replace('text-accent', 'text-[#ffcc00]')
    content = content.replace('hover:shadow-indigo-900/5', 'hover:shadow-cyan-500/10')
    content = content.replace('hover:border-accent', 'hover:border-cyan-500/50')
    content = content.replace('shadow-indigo-600/20', 'shadow-cyan-500/20')
    content = content.replace('border-indigo-100/50', 'border-cyan-500/20')
    
    # Update buttons
    content = content.replace('btn-secondary', 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all')
    content = content.replace('btn-primary', 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl border border-cyan-400/30 transition-all shadow-lg shadow-cyan-500/20')
    
    # Inputs
    content = content.replace('input-modern', 'bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500')
    
    # Empty state / placeholders
    content = content.replace('text-slate-300', 'text-slate-500') # Some text-slate-300 were used for empty states, maybe keep them or adjust. Actually wait, text-slate-300 is good for text, let's revert or check.
    
    # Fix a few stragglers
    content = content.replace('text-slate-500', 'text-slate-400')
    content = content.replace('text-slate-700', 'text-slate-300') # Usually used on light bg pills
    content = content.replace('bg-slate-100', 'bg-slate-800')     # Pills
    
    # We should ensure the overall space-y-12 container has dark styling too.
    # Actually, if we apply it to the parent app, or just add bg-slate-950 to the whole marketplace wrapper.
    # Line 199: <div className="space-y-12">
    content = content.replace('<div className="space-y-12">', '<div className="space-y-12 bg-slate-950 min-h-screen pb-20">')

    # Recharts theme tweaks
    content = content.replace('stroke="#4f46e5"', 'stroke="#22d3ee"') # cyan-400
    content = content.replace('stopColor="#4f46e5"', 'stopColor="#22d3ee"')
    content = content.replace('stroke="#94a3b8"', 'stroke="#64748b"')
    content = content.replace('fill: \'#64748b\'', 'fill: \'#94a3b8\'')

    with open(file_path, 'w') as f:
        f.write(content)

transform('src/pages/Marketplace.tsx')
