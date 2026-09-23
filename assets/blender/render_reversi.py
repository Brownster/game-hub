"""Render the Othello disc faces for GameHub.

    blender --background --python assets/blender/render_reversi.py -- --out <dir>

An Othello disc is a lathe job like the chess pieces: a bevelled rim and a
gently domed face. Both sides are rendered from straight overhead so the board
can show one face per side of a CSS 3D flip — the disc's rotation is driven by
its colour, so a captured disc animates without the board tracking any history.

Rendered square and transparent. The board sizes them in CSS.
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chesslib as cl  # noqa: E402
from render_chess import hex_to_linear, reset_scene, add_area_light  # noqa: E402

# Not pure black and white: a true #000 disc loses all form against a dark board
# and #fff clips its own highlight. These are the ink and bone the board uses.
DISC_DARK_HEX = "#23201c"
DISC_LIGHT_HEX = "#f2ece0"

DISC_RADIUS = 1.0


def disc_profile():
    """Half-section of a disc: flat underside, bevelled rim, domed face."""
    r = DISC_RADIUS
    return [
        (0.00 * r, 0.000 * r),
        (0.84 * r, 0.000 * r),
        (0.94 * r, 0.018 * r),
        (0.99 * r, 0.055 * r),
        (1.00 * r, 0.095 * r),
        (0.98 * r, 0.135 * r),
        (0.92 * r, 0.168 * r),
        (0.78 * r, 0.192 * r),
        (0.55 * r, 0.208 * r),
        (0.30 * r, 0.216 * r),
        (0.00 * r, 0.219 * r),
    ]


def disc_material(name, base_hex):
    """Moulded plastic: near-uniform colour, a tight highlight, no grain."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")

    bsdf.inputs["Base Color"].default_value = (*hex_to_linear(base_hex), 1.0)
    bsdf.inputs["Roughness"].default_value = 0.22
    for optional, value in (("Specular IOR Level", 0.55), ("Coat Weight", 0.5), ("Coat Roughness", 0.08)):
        if optional in bsdf.inputs:
            bsdf.inputs[optional].default_value = value

    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def setup_top_down_camera():
    data = bpy.data.cameras.new("camera")
    data.type = "ORTHO"
    # A little room around the rim so the drop shadow in CSS has somewhere to go.
    data.ortho_scale = DISC_RADIUS * 2.12

    cam = bpy.data.objects.new("camera", data)
    cam.location = Vector((0.0, 0.0, 8.0))
    cam.rotation_euler = (0.0, 0.0, 0.0)  # Straight down the -Z axis.
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam


def setup_lighting():
    """Overhead key from the upper left, plus a low wrap so the dark disc keeps
    a readable rim instead of dissolving into the board behind it."""
    add_area_light("key", (-2.0, 2.4, 4.2),
                   (math.radians(28), 0, math.radians(-38)), 260, 4.0)
    add_area_light("wrap", (2.6, -2.2, 1.6),
                   (math.radians(62), 0, math.radians(132)), 52, 5.0)
    add_area_light("rim", (0.0, -3.0, 0.6),
                   (math.radians(88), 0, math.radians(180)), 44, 3.0)

    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.08, 0.09, 0.07, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5
    bpy.context.scene.world = world


def setup_render(resolution, samples):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.seed = 0
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.compression = 90
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--resolution", type=int, default=256)
    parser.add_argument("--samples", type=int, default=128)
    args = parser.parse_args(argv)

    os.makedirs(args.out, exist_ok=True)

    reset_scene()
    setup_render(args.resolution, args.samples)
    setup_lighting()
    setup_top_down_camera()

    for side, base_hex in (("dark", DISC_DARK_HEX), ("light", DISC_LIGHT_HEX)):
        disc = cl.lathe(f"disc_{side}", disc_profile(), segments=128)
        bpy.context.view_layer.objects.active = disc
        bpy.ops.object.shade_auto_smooth(angle=math.radians(32))

        disc.data.materials.clear()
        disc.data.materials.append(disc_material(side, base_hex))

        path = os.path.join(args.out, f"disc-{side}.png")
        bpy.context.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print(f"[render] {path}")

        bpy.data.objects.remove(disc, do_unlink=True)


if __name__ == "__main__":
    main()
