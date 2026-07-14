import re

path = r"c:\Users\gharb\.gemini\antigravity-ide\scratch\omarzerou-web\mi-delivery-web\src\app\restaurant\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace hardcoded colors with CSS variables
replacements = {
    r"bg-\[\#F7F7F7\]": "bg-[var(--theme-bg,#F7F7F7)]",
    r"bg-\[\#F8F9FA\]": "bg-[var(--theme-bg-alt,#F8F9FA)]",
    r"bg-white": "bg-[var(--theme-card,#fff)]",
    r"border-\[\#EFEFEF\]": "border-[var(--theme-border,#EFEFEF)]",
    r"border-\[\#F0F0F0\]": "border-[var(--theme-border,#F0F0F0)]",
    r"text-\[\#1B1B1B\]": "text-[var(--theme-text,#1B1B1B)]",
    r"text-\[\#888\]": "text-[var(--theme-text-sec,#888)]",
    r"text-\[\#FF6B35\]": "text-[var(--theme-primary,#FF6B35)]",
    r"text-\[\#555\]": "text-[var(--theme-text-mute,#555)]",
    r"bg-\[\#FF6B35\]": "bg-[var(--theme-primary,#FF6B35)]",
    r"bg-\[\#F5F5F5\]": "bg-[var(--theme-tab-inactive,#F5F5F5)]",
    r"shadow-\[0_8px_30px_rgba\(0,0,0,0\.04\)\]": "shadow-[var(--theme-shadow,0_8px_30px_rgba(0,0,0,0.04))]",
    r"linear-gradient\(135deg,\#FF6B35,\#FF8C55\)": "var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))",
}

new_content = content
for pattern, replacement in replacements.items():
    new_content = re.sub(pattern, replacement, new_content)

# We must keep background="linear-gradient(...)" working. Wait, if it's in a style tag, it's fine.
# E.g. style={{ background:"var(--theme-primary-grad, linear-gradient(135deg,#FF6B35,#FF8C55))" }}

# Add theme detection and inline styles to the main div wrapper
theme_style_injection = """
  const isPaloma = rest && rest.name.toLowerCase().includes("paloma");
  const themeStyles = isPaloma ? {
    '--theme-bg': '#111111',
    '--theme-bg-alt': '#1A1A1A',
    '--theme-card': '#222222',
    '--theme-border': '#333333',
    '--theme-text': '#FFFFFF',
    '--theme-text-sec': '#AAAAAA',
    '--theme-text-mute': '#BBBBBB',
    '--theme-primary': '#E60000',
    '--theme-primary-grad': 'linear-gradient(135deg, #E60000, #FF3333)',
    '--theme-tab-inactive': '#333333',
    '--theme-shadow': '0 8px 30px rgba(230,0,0,0.1)'
  } : {};
"""

# Inject theme object before return
if "const changeQty" in new_content:
    new_content = new_content.replace(
        "const cartTotal = cart.reduce((s, i) => s + (i.basePrice + i.extrasPrice) * i.qty, 0);",
        "const cartTotal = cart.reduce((s, i) => s + (i.basePrice + i.extrasPrice) * i.qty, 0);\n" + theme_style_injection
    )

# Inject style={themeStyles} into the root div
new_content = new_content.replace(
    '<div className="min-h-screen bg-[var(--theme-bg,#F7F7F7)]" style={{ fontFamily: "\'Inter\', system-ui, sans-serif" }}>',
    '<div className="min-h-screen bg-[var(--theme-bg,#F7F7F7)]" style={{ fontFamily: "\'Inter\', system-ui, sans-serif", ...themeStyles as React.CSSProperties }}>'
)

# And similarly for the order success div
new_content = new_content.replace(
    '<div className="min-h-screen bg-[var(--theme-bg-alt,#F8F9FA)] flex flex-col items-center justify-center p-6" style={{ fontFamily: "\'Inter\', sans-serif" }}>',
    '<div className="min-h-screen bg-[var(--theme-bg-alt,#F8F9FA)] flex flex-col items-center justify-center p-6" style={{ fontFamily: "\'Inter\', sans-serif", ...themeStyles as React.CSSProperties }}>'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Replaced colors with CSS variables.")
