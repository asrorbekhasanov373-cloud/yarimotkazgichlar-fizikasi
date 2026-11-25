# Sardor ovozidagi o'zbekcha nutq tembrini foydalanuvchi ovoziga o'tkazish (Seed-VC, CPU)
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seed-vc'))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seed-vc'))
import numpy as np, soundfile as sf, torch
torch.set_num_threads(4)
from seed_vc_wrapper import SeedVCWrapper
SeedVCWrapper._load_f0_model = lambda self: None
ref = sys.argv[1]; pairs = sys.argv[2:]
t = time.time(); vc = SeedVCWrapper(device=torch.device('cpu')); print('model', round(time.time() - t, 1), 's', flush=True)
for i in range(0, len(pairs), 2):
    src, out = pairs[i], pairs[i + 1]; t = time.time()
    y = vc.convert_voice(src, ref, diffusion_steps=int(os.environ.get('STEPS', 25)), inference_cfg_rate=0.7,
                         f0_condition=False, stream_output=False)
    import types
    if isinstance(y, types.GeneratorType):
        last = None
        try:
            while True: last = next(y)
        except StopIteration as e:
            y = e.value if e.value is not None else (last[-1] if last else None)
    if isinstance(y, tuple): y = y[-1]
    sf.write(out, np.asarray(y, dtype=np.float32), 22050)
    print(os.path.basename(out), round(time.time() - t, 1), 's', flush=True)
