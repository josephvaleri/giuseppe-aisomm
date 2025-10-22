# Giuseppe v2 — Layered Character Pack (Rive-ready)

This pack contains a clean, flat-style avatar split into Rive-friendly layers with transparent backgrounds (2048×2048 canvas).

## Key Layers
- head_base.png
- hair_front.png
- eyes_white_L.png / eyes_white_R.png
- pupil_L.png / pupil_R.png
- lid_upper_L.png / lid_upper_R.png / lid_lower_L.png / lid_lower_R.png
- eyes_closed.png (convenience overlay for a simple Blink timeline)
- brow_L.png / brow_R.png
- mouth_rest.png, mouth_AE.png, mouth_OU.png, mouth_FV.png, mouth_L.png, mouth_MBP.png, mouth_smile.png
- neck_base.png, torso.png
- arm.png, glass_outline.png, wine_fill.png, glass_highlight.png
- base_open.png (a preview composite)

## Rive Setup
1) Import all PNGs (Design tab). Keep pupils and lids above the whites; keep eyes_closed above head_base.
2) Group visible parts into **GiuseppeRoot** and set the pivot at the neck (Origin tool).
3) Timelines (Animate tab):
   - **IdleLoop** (Loop): tiny rotation & Y bob on GiuseppeRoot; scale by `idleIntensity` if desired.
   - **Blink** (One Shot): either animate **eyes_closed** opacity, or animate individual lid layers.
   - **TalkDrive** (Loop): subtle up/down bounce when speaking.
   - (Optional) HeadLeft/Right/Up/Down for lookX/lookY blending.
4) State Machine **AvatarState**:
   - Inputs: `blink`(Trigger), `isSpeaking`(Boolean), optional `viseme`(Number), `lookX/lookY`.
   - Default: `IdleLoop`.
   - OneShot: `Blink` (Any State → Blink, Fire=blink).
   - Speaking: blend `TalkDrive` when `isSpeaking == true`.
   - Viseme: either switch mouth layers via Number input or use separate timelines per viseme.
5) Export **giuseppe.riv** and use the React wiring previously provided.

## Notes
- All layers are aligned on the same canvas for easy import and rigging.
- You can recolor by editing individual PNGs or replacing layers.
- If you prefer vectors, you can trace these shapes in Rive or import from Figma/Illustrator.
