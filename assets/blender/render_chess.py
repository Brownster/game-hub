"""Render GameHub's chess piece sprites from procedural geometry.

    blender --background --python assets/blender/render_chess.py -- --out <dir>

Every piece is generated from code (see chesslib.py), lit by a fixed three-point
rig and rendered through one orthographic camera, so all twelve sprites share a
single scale. A pawn really is shorter than a king in the output PNGs, and the
set can be re-rendered at any resolution without redrawing anything.
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chesslib as cl  # noqa: E402

# Deliberately NOT --wood-light / --wood-dark: those are the board *square*
# colours, and pieces painted in them vanish against their own board. Real sets
# use boxwood and ebony for exactly this reason. These stay in the warm wood
# family so they sit with the design system, but bracket the board tones from
# outside: paler than --wood-light, darker than --wood-dark.
BOXWOOD_HEX = "#f0e2c8"
EBONY_HEX = "#3b2415"

PIECES = ["pawn", "rook", "knight", "bishop", "queen", "king"]


def srgb_to_linear(c):
    """Blender colour sockets are linear; CSS hex is sRGB. Feeding one as the
    other is why a token-matched colour comes out washed and desaturated."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear(value, scale=1.0):
    value = value.lstrip("#")
    rgb = [int(value[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(min(1.0, srgb_to_linear(c) * scale) for c in rgb)


# --------------------------------------------------------------------------
# Scene
# --------------------------------------------------------------------------

def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def wood_material(name, base_hex, seed):
    """Turned wood: growth rings concentric around the lathe axis.

    Grain is a narrow band either side of the base colour. Wide contrast reads as
    painted stripes at sprite size; what sells wood is a subtle tonal shift."""
    light = hex_to_linear(base_hex, scale=1.07)
    dark = hex_to_linear(base_hex, scale=0.79)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    wave = nt.nodes.new("ShaderNodeTexWave")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    bump = nt.nodes.new("ShaderNodeBump")

    # Offset each material slightly so the two woods do not share a grain pattern.
    mapping.inputs["Location"].default_value = (seed * 0.37, seed * 0.11, seed * 0.53)
    mapping.inputs["Scale"].default_value = (1.0, 1.0, 0.65)

    wave.wave_type = "RINGS"
    wave.rings_direction = "Z"
    wave.inputs["Scale"].default_value = 13.0
    wave.inputs["Distortion"].default_value = 2.4
    wave.inputs["Detail"].default_value = 3.0
    wave.inputs["Detail Scale"].default_value = 1.4

    noise.inputs["Scale"].default_value = 28.0
    noise.inputs["Detail"].default_value = 6.0

    ramp.color_ramp.interpolation = "EASE"
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (*dark, 1.0)
    ramp.color_ramp.elements[1].position = 0.74
    ramp.color_ramp.elements[1].color = (*light, 1.0)

    bump.inputs["Strength"].default_value = 0.08

    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    bsdf.inputs["Roughness"].default_value = 0.34
    for optional, value in (("Specular IOR Level", 0.45), ("Coat Weight", 0.22), ("Coat Roughness", 0.18)):
        if optional in bsdf.inputs:
            bsdf.inputs[optional].default_value = value

    return mat


def add_area_light(name, location, rotation, energy, size):
    data = bpy.data.lights.new(name, type="AREA")
    data.energy = energy
    data.size = size
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.collection.objects.link(obj)
    return obj


def setup_lighting(frame_height):
    """Three-point rig. The rim light matters most: it separates the ebony
    pieces from a dark square once the sprite is composited onto a board."""
    h = frame_height
    add_area_light("key", (-2.2 * h, -2.6 * h, 2.5 * h),
                   (math.radians(56), 0, math.radians(-40)), 168 * h * h, 3.0 * h)
    add_area_light("fill", (2.6 * h, -2.0 * h, 1.1 * h),
                   (math.radians(76), 0, math.radians(52)), 46 * h * h, 4.0 * h)
    add_area_light("rim", (1.1 * h, 2.8 * h, 2.4 * h),
                   (math.radians(122), 0, math.radians(160)), 96 * h * h, 2.2 * h)

    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.05, 0.04, 0.035, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    bpy.context.scene.world = world


def setup_camera(frame_height):
    """One orthographic camera for every piece, so relative heights are true.

    A slight elevation shows a hint of the top of each piece, which is how a
    sprite needs to read when it sits on a 2D board."""
    data = bpy.data.cameras.new("camera")
    data.type = "ORTHO"
    data.ortho_scale = frame_height * 1.03

    cam = bpy.data.objects.new("camera", data)
    elevation = math.radians(9.0)
    distance = 10.0 * frame_height
    target_z = frame_height * 0.50

    cam.location = Vector((0.0, -distance * math.cos(elevation),
                           target_z + distance * math.sin(elevation)))
    cam.rotation_euler = (math.radians(90) - elevation, 0.0, 0.0)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    return cam


def setup_render(resolution, samples):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.seed = 0  # Fixed, so repeat renders are identical.
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.compression = 90
    # Standard, not AgX or Filmic: the piece palette is chosen against the
    # board tones by value, and a film curve would shift both ends of it.
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"


# --------------------------------------------------------------------------
# Pieces needing more than a lathe
# --------------------------------------------------------------------------

def build_rook(h):
    body = cl.lathe("rook", cl.rook_profile())
    # Four crenellations, cut as notches through the battlement rim.
    for i in range(4):
        angle = math.radians(45 + i * 90)
        cutter = cl.add_cube(
            f"crenel_{i}",
            size=(0.20 * h, 0.62 * h, 0.16 * h),
            location=(0.0, 0.0, 0.90 * h),
            rotation=(0.0, 0.0, angle),
        )
        cl.boolean(body, cutter)
    return body


def build_bishop(h):
    body = cl.lathe("bishop", cl.bishop_profile())
    # The mitre's diagonal slit.
    cutter = cl.add_cube(
        "mitre_slit",
        size=(0.40 * h, 0.030 * h, 0.16 * h),
        location=(0.0, 0.0, 0.775 * h),
        rotation=(0.0, math.radians(-32), 0.0),
    )
    cl.boolean(body, cutter)
    return body


def build_queen(h):
    body = cl.lathe("queen", cl.queen_profile())
    # Cut the coronet into points.
    for i in range(8):
        angle = math.radians(i * 45)
        cutter = cl.add_cube(
            f"coronet_{i}",
            size=(0.075 * h, 0.52 * h, 0.085 * h),
            location=(0.0, 0.0, 0.782 * h),
            rotation=(0.0, 0.0, angle),
        )
        cl.boolean(body, cutter)
    return body


def build_king(h):
    body = cl.lathe("king", cl.king_profile())
    # No coronet notches: the crown wall is thinner than any cut worth seeing,
    # so every attempt punched through and showed the hollow interior as black
    # slots. The cross is what identifies a king anyway.
    upright = cl.add_cube("cross_v", (0.052 * h, 0.052 * h, 0.225 * h),
                          (0.0, 0.0, 0.875 * h))
    arm = cl.add_cube("cross_h", (0.145 * h, 0.050 * h, 0.050 * h),
                      (0.0, 0.0, 0.905 * h))
    return cl.join([body, upright, arm])


# Stylised horse-head silhouette, muzzle towards -X, in pawn units.
KNIGHT_SILHOUETTE = [
    # Runs clockwise from the base of the neck, up the crest, over the ears,
    # down the face to the muzzle, then back along the jaw and throat. The
    # bottom points sit below the pedestal top so the two solids interlock.
    (0.072, 0.290), (0.119, 0.549), (0.143, 0.643), (0.149, 0.729),
    (0.134, 0.802), (0.119, 0.867),
    (0.130, 0.930), (0.112, 0.975), (0.086, 0.925),   # near ear
    (0.064, 0.958), (0.034, 0.905),                   # far ear, forehead
    (-0.026, 0.884), (-0.085, 0.834), (-0.136, 0.774),
    (-0.167, 0.719), (-0.168, 0.676), (-0.145, 0.645),
    (-0.100, 0.633), (-0.060, 0.652), (-0.017, 0.618),
    (0.017, 0.559), (0.043, 0.290),
]


def build_knight(h):
    """A lathed pedestal carrying an extruded, bevelled head silhouette.

    The head is built as a filled curve with extrude and bevel rather than a
    hand-rolled extrusion: the bevel rounds the carved edges for free, which is
    what makes it read as turned wood rather than laser-cut ply."""
    # A dedicated pedestal rather than the shared base_profile: that profile's
    # collar flares outward just below the stem, which around a flat-topped
    # column reads as a saucer the head is sitting in. This one tapers straight
    # through. Its shoulder is still wider than the head is thick (0.34h across
    # versus roughly 0.29h) so the slab sits inside the column instead of
    # overhanging it and casting a dark slot under the jaw.
    #
    # An exact-solver UNION was tried first and destroyed the head: the curve's
    # extrude-plus-bevel output is not clean enough for it, so these stay two
    # joined solids that interlock.
    pedestal = cl.lathe("knight_base", [
        (0.000 * h, 0.000 * h),
        (0.300 * h, 0.000 * h),
        (0.300 * h, 0.055 * h),
        (0.278 * h, 0.095 * h),
        (0.240 * h, 0.150 * h),
        (0.208 * h, 0.215 * h),
        (0.188 * h, 0.290 * h),
        (0.176 * h, 0.365 * h),
        (0.170 * h, 0.440 * h),
        (0.000 * h, 0.452 * h),
    ])

    curve = bpy.data.curves.new("knight_head", type="CURVE")
    curve.dimensions = "2D"
    curve.fill_mode = "BOTH"
    curve.extrude = 0.125 * h
    curve.bevel_depth = 0.022 * h
    curve.bevel_resolution = 4
    curve.resolution_u = 6

    spline = curve.splines.new("POLY")
    spline.points.add(len(KNIGHT_SILHOUETTE) - 1)
    for i, (x, z) in enumerate(KNIGHT_SILHOUETTE):
        spline.points[i].co = (x * h, z * h, 0.0, 1.0)
    spline.use_cyclic_u = True

    head = bpy.data.objects.new("knight_head", curve)
    bpy.context.collection.objects.link(head)
    bpy.context.view_layer.objects.active = head
    head.select_set(True)
    bpy.ops.object.convert(target="MESH")
    head = bpy.context.active_object

    # Stand the head upright: the curve was authored in XY, the piece lives in XZ.
    head.rotation_euler = (math.radians(90), 0.0, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    return cl.join([pedestal, head])


BUILDERS = {
    "rook": build_rook,
    "bishop": build_bishop,
    "queen": build_queen,
    "king": build_king,
    "knight": build_knight,
}


def build_piece(name):
    h = cl.PIECE_HEIGHTS[name]
    if name in BUILDERS:
        obj = BUILDERS[name](h)
    else:
        obj = cl.lathe(name, cl.PROFILES[name]())

    # Smooth shading with an angle threshold keeps turned surfaces soft while
    # leaving the crenellation and cross edges crisp.
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
    return obj


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, help="output directory for PNGs")
    parser.add_argument("--resolution", type=int, default=512)
    parser.add_argument("--samples", type=int, default=128)
    parser.add_argument("--only", default=None, help="render a single piece")
    args = parser.parse_args(argv)

    os.makedirs(args.out, exist_ok=True)
    frame_height = cl.PIECE_HEIGHTS["king"]

    reset_scene()
    setup_render(args.resolution, args.samples)
    setup_lighting(frame_height)
    setup_camera(frame_height)

    materials = {
        "w": wood_material("boxwood", BOXWOOD_HEX, seed=1),
        "b": wood_material("ebony", EBONY_HEX, seed=2),
    }

    names = [args.only] if args.only else PIECES
    for name in names:
        for side, material in materials.items():
            obj = build_piece(name)
            # Clear first: a boolean leaves behind an empty slot inherited from
            # the cutter, and appending past it puts the wood at index 1 while
            # every polygon still points at slot 0, rendering Cycles default grey.
            obj.data.materials.clear()
            obj.data.materials.append(material)

            path = os.path.join(args.out, f"{side}_{name}.png")
            bpy.context.scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            print(f"[render] {path}")

            bpy.data.objects.remove(obj, do_unlink=True)


if __name__ == "__main__":
    main()
