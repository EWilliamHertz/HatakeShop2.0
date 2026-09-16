with open('src/pages/Home.tsx', 'r') as f:
    content = f.read()

content = content.replace('          </div>\n        </div>\n\n      <div className="px-4', '          </div>\n        </div>\n      </div>\n\n      <div className="px-4')

with open('src/pages/Home.tsx', 'w') as f:
    f.write(content)
