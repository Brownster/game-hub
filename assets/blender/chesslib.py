"""Procedural Staunton-style chess pieces for GameHub.

Every piece except the knight is a lathed profile, which is how chess pieces are
actually turned on a lathe. A profile is a list of (radius, height) points running
from the centre of the base up to the centre of the finial; spinning it around Z
produces a closed, watertight solid.

Heights are expressed in "pawn units" so the set stays in proportion if one piece
is retuned. Nothing here depends on a .blend file, so renders are reproducible
from source.
"""

import math

import bmesh
import bpy
from mathutils import Vector

# Relative heights, following classic Staunton proportions.
PIECE_HEIGHTS = {
    "pawn": 1.00,
    "rook": 1.18,
    "knight": 1.32,
    "bishop": 1.44,
    "queen": 1.62,
    "king": 1.85,
}

LATHE_SEGMENTS = 96


# --------------------------------------------------------------------------
# Profile helpers
# --------------------------------------------------------------------------

def arc(cx, cz, radius, start_deg, end_deg, steps):
    """Points along a circular arc, for domes, spheres and coves."""
    pts = []
    for i in range(steps + 1):
        t = start_deg + (end_deg - start_deg) * (i / steps)
        a = math.radians(t)
        pts.append((cx + radius * math.sin(a), cz + radius * math.cos(a)))
    return pts


def base_profile(foot_radius, height_to_stem, stem_radius):
    """The flared foot shared by every piece: a wide skirt easing into the stem."""
    return [
        (0.0, 0.0),
        (foot_radius, 0.0),
        (foot_radius, height_to_stem * 0.18),
        (foot_radius * 0.93, height_to_stem * 0.30),
        # Cove: the concave sweep from skirt into stem.
        (foot_radius * 0.72, height_to_stem * 0.46),
        (foot_radius * 0.52, height_to_stem * 0.62),
        (foot_radius * 0.40, height_to_stem * 0.74),
        # Collar ring above the foot.
        (foot_radius * 0.46, height_to_stem * 0.82),
        (foot_radius * 0.44, height_to_stem * 0.88),
        (stem_radius * 1.25, height_to_stem * 0.94),
        (stem_radius, height_to_stem),
    ]


def collar(radius, z, thickness, flare=1.5):
    """A turned ring, the detail that makes a lathed piece read as carved."""
    return [
        (radius, z),
        (radius * flare, z + thickness * 0.30),
        (radius * flare, z + thickness * 0.70),
        (radius, z + thickness),
    ]


# --------------------------------------------------------------------------
# Piece profiles
# --------------------------------------------------------------------------

def pawn_profile():
    h = PIECE_HEIGHTS["pawn"]
    p = base_profile(foot_radius=0.30 * h, height_to_stem=0.22 * h, stem_radius=0.105 * h)
    p += [
        (0.098 * h, 0.34 * h),
        (0.092 * h, 0.44 * h),
    ]
    p += collar(0.092 * h, 0.44 * h, 0.055 * h, flare=1.62)
    p += [(0.082 * h, 0.52 * h)]
    # Spherical head.
    p += arc(0.0, 0.645 * h, 0.145 * h, 125, 0, 18)
    return p


def rook_profile():
    h = PIECE_HEIGHTS["rook"]
    p = base_profile(foot_radius=0.33 * h, height_to_stem=0.24 * h, stem_radius=0.175 * h)
    p += [
        (0.168 * h, 0.36 * h),
        (0.170 * h, 0.50 * h),
    ]
    # Flared battlement rim.
    p += [
        (0.185 * h, 0.56 * h),
        (0.225 * h, 0.62 * h),
        (0.232 * h, 0.66 * h),
        (0.232 * h, 0.92 * h),
        # Hollow the tower mouth so the crenellations read as cut from a wall.
        (0.176 * h, 0.92 * h),
        (0.176 * h, 0.74 * h),
        (0.0, 0.72 * h),
    ]
    return p


def bishop_profile():
    h = PIECE_HEIGHTS["bishop"]
    p = base_profile(foot_radius=0.285 * h, height_to_stem=0.20 * h, stem_radius=0.108 * h)
    p += [
        (0.100 * h, 0.30 * h),
        (0.094 * h, 0.40 * h),
    ]
    p += collar(0.094 * h, 0.40 * h, 0.048 * h, flare=1.75)
    p += [(0.086 * h, 0.47 * h)]
    # Mitre: a swelling bell that tapers to a point, topped with a finial.
    p += [
        (0.128 * h, 0.53 * h),
        (0.152 * h, 0.60 * h),
        (0.156 * h, 0.66 * h),
        (0.140 * h, 0.73 * h),
        (0.108 * h, 0.80 * h),
        (0.062 * h, 0.86 * h),
        (0.040 * h, 0.89 * h),
    ]
    p += arc(0.0, 0.928 * h, 0.046 * h, 118, 0, 12)
    return p


def queen_profile():
    h = PIECE_HEIGHTS["queen"]
    p = base_profile(foot_radius=0.275 * h, height_to_stem=0.185 * h, stem_radius=0.102 * h)
    p += [
        (0.096 * h, 0.28 * h),
        (0.088 * h, 0.40 * h),
    ]
    p += collar(0.088 * h, 0.40 * h, 0.045 * h, flare=1.70)
    p += [(0.082 * h, 0.465 * h)]
    # Flared coronet, cut into points by the crown boolean.
    p += [
        (0.118 * h, 0.52 * h),
        (0.145 * h, 0.58 * h),
        (0.170 * h, 0.66 * h),
        (0.182 * h, 0.72 * h),
        (0.182 * h, 0.78 * h),
        (0.150 * h, 0.78 * h),
        (0.142 * h, 0.735 * h),
    ]
    # Ball finial rising from the middle of the coronet.
    p += [
        (0.052 * h, 0.75 * h),
        (0.048 * h, 0.80 * h),
    ]
    p += arc(0.0, 0.838 * h, 0.052 * h, 120, 0, 14)
    return p


def king_profile():
    h = PIECE_HEIGHTS["king"]
    p = base_profile(foot_radius=0.262 * h, height_to_stem=0.170 * h, stem_radius=0.098 * h)
    p += [
        (0.092 * h, 0.26 * h),
        (0.084 * h, 0.38 * h),
    ]
    p += collar(0.084 * h, 0.38 * h, 0.042 * h, flare=1.70)
    p += [(0.078 * h, 0.44 * h)]
    # Crown: flared, with a flat rim the cross sits on.
    p += [
        (0.110 * h, 0.49 * h),
        (0.138 * h, 0.55 * h),
        (0.158 * h, 0.62 * h),
        (0.166 * h, 0.68 * h),
        (0.166 * h, 0.735 * h),
        (0.140 * h, 0.755 * h),
        (0.100 * h, 0.765 * h),
        (0.052 * h, 0.775 * h),
        (0.0, 0.782 * h),
    ]
    return p


PROFILES = {
    "pawn": pawn_profile,
    "rook": rook_profile,
    "bishop": bishop_profile,
    "queen": queen_profile,
    "king": king_profile,
}


# --------------------------------------------------------------------------
# Mesh construction
# --------------------------------------------------------------------------

def lathe(name, profile, segments=LATHE_SEGMENTS):
    """Revolve a (radius, height) profile around the Z axis into a solid."""
    bm = bmesh.new()

    verts = [bm.verts.new((r, 0.0, z)) for r, z in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]

    bmesh.ops.spin(
        bm,
        geom=verts + edges,
        axis=(0.0, 0.0, 1.0),
        cent=(0.0, 0.0, 0.0),
        dvec=(0.0, 0.0, 0.0),
        angle=2 * math.pi,
        steps=segments,
        use_merge=False,
    )

    # The spin leaves a doubled seam where the sweep closes.
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def add_cube(name, size, location, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(size)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def boolean(target, cutter, operation="DIFFERENCE"):
    mod = target.modifiers.new(name=f"bool_{cutter.name}", type="BOOLEAN")
    mod.object = cutter
    mod.operation = operation
    mod.solver = "EXACT"
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def join(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    return bpy.context.active_object
