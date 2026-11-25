# Hugging Face "spaces" paketining GPU dekoratori o'rniga mahalliy (CPU) almashtirgich
def GPU(*a, **k):
    if a and callable(a[0]): return a[0]
    return lambda f: f
