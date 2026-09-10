import os, glob

def fix(f):
    with open(f, 'r') as file:
        content = file.read()
    content = content.replace('text-gray-900', 'text-slate-200')
    content = content.replace('text-gray-800', 'text-slate-200')
    content = content.replace('text-gray-700', 'text-slate-300')
    content = content.replace('text-gray-600', 'text-slate-400')
    content = content.replace('text-gray-500', 'text-slate-400')
    content = content.replace('text-gray-400', 'text-slate-400')
    content = content.replace('text-gray-300', 'text-slate-500')
    
    content = content.replace('bg-gray-50', 'bg-slate-900')
    content = content.replace('bg-gray-100', 'bg-slate-800')
    content = content.replace('bg-gray-200', 'bg-slate-800')
    content = content.replace('bg-gray-300', 'bg-slate-700')
    
    content = content.replace('border-gray-200', 'border-slate-800')
    content = content.replace('border-gray-300', 'border-slate-700')
    
    with open(f, 'w') as file:
        file.write(content)

for f in glob.glob("src/**/*.tsx", recursive=True):
    fix(f)
