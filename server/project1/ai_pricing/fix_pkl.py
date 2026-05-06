"""
fix_pkl.py
Run this ONCE from your project1 directory:

    python fix_pkl.py

It patches the pkl IN PLACE so it works with your older NumPy.
"""
import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
import os

PKL_PATH = os.path.join(os.path.dirname(__file__), 'ai_pricing', 'rentlyx_model_.pkl')

print(f"Loading: {PKL_PATH}")
print(f"Exists:  {os.path.exists(PKL_PATH)}")

# ── Monkey-patch the broken BitGenerator import BEFORE loading ─────────────
# numpy <1.22 doesn't have numpy.random._mt19937.MT19937 as a BitGenerator.
# We register it as an alias so pickle can deserialise the object.
import numpy.random
try:
    import numpy.random._mt19937 as _mt
    # If this import works, register MT19937 as a known BitGenerator
    if not hasattr(numpy.random, '_bit_generator_ctors'):
        pass
    # Force-register
    numpy.random.bit_generator._get_bit_generator = lambda name: getattr(_mt, name)
except Exception:
    pass

# ── Safer approach: use a custom unpickler ────────────────────────────────
import pickle, io

class SafeUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        # Redirect the broken MT19937 BitGenerator to a safe RandomState
        if module == 'numpy.random._mt19937' and name == 'MT19937':
            # Return a factory that produces a plain RandomState instead
            class FakeMT19937:
                def __new__(cls, *a, **kw):
                    return np.random.RandomState(42)
            return FakeMT19937
        if module == 'numpy.random._pickle' and name == '__bit_generator_ctor':
            def ctor(*a, **kw):
                return np.random.RandomState(42)
            return ctor
        if module == 'numpy.random._pickle' and name == '__randomstate_ctor':
            def ctor(*a, **kw):
                return np.random.RandomState(42)
            return ctor
        return super().find_class(module, name)

# ── Load with safe unpickler ───────────────────────────────────────────────
import joblib.numpy_pickle as jnp

print("Loading pkl with safe unpickler...")
with open(PKL_PATH, 'rb') as f:
    raw_bytes = f.read()

try:
    m = SafeUnpickler(io.BytesIO(raw_bytes)).load()
    print("Safe unpickle succeeded!")
except Exception as e:
    print(f"Safe unpickle failed: {e}")
    print("Trying joblib fallback...")
    m = joblib.load(PKL_PATH)

# ── Fix the _rng on the model ─────────────────────────────────────────────
old_model = m['model']
new_model = GradientBoostingRegressor.__new__(GradientBoostingRegressor)
new_model.__dict__.update(old_model.__dict__)
new_model._rng = np.random.RandomState(42)   # ← the fix
m['model'] = new_model

# ── Quick sanity check ────────────────────────────────────────────────────
import pandas as pd
X = pd.DataFrame(
    [[1, 2, 1, 1, 22048.7, 9847.7, 18097.6]],
    columns=['bhk','locality_code','apartment_code','floor',
             'locality_avg','bhk_avg','apartment_avg']
)
pred = new_model.predict(X)[0]
print(f"Test prediction: Rs {round(pred):,}  ✅")
print(f"_rng type: {type(new_model._rng)}")

# ── Save back in place ────────────────────────────────────────────────────
joblib.dump(m, PKL_PATH)
print(f"\n✅ Fixed pkl saved to: {PKL_PATH}")
print("Now restart daphne!")
