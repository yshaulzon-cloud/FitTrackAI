"""Areto: headless-ish dump of a configured human (mesh, skeleton, skin weights) to JSON.
Runs only when the ARETO_DUMP environment variable points at an output .json path."""
import os
import json
import traceback

OUT = os.environ.get('ARETO_DUMP')
CFG = json.loads(os.environ.get('ARETO_CFG', '{}'))


def _dump(human):
    skel = human.getSkeleton()
    raw = human.getVertexWeights(skel)
    bones = []
    for b in skel.getBones():
        bones.append({
            'name': b.name,
            'parent': b.parent.name if b.parent else None,
            'head': [float(x) for x in b.headPos],
            'tail': [float(x) for x in b.tailPos],
            'mat': [[float(x) for x in row] for row in b.matRestGlobal],
        })
    meshes = []
    for obj in human.getObjects(excludeZeroFaceObjs=True):
        mesh = obj.mesh.clone(1, filterMaskedVerts=True)
        pw = obj.proxy.getVertexWeights(raw, skel) if obj.proxy else raw
        w = mesh.getVertexWeights(pw)
        weights = {}
        for bname, (verts, ws) in w.data.items():
            weights[bname] = [[int(v) for v in verts], [round(float(x), 5) for x in ws]]
        groups = [fg.name for fg in mesh.faceGroups] if hasattr(mesh, 'faceGroups') else []
        meshes.append({
            'name': obj.proxy.name if obj.proxy else 'body',
            'type': (obj.proxy.type if obj.proxy else 'Body'),
            'coord': [round(float(x), 5) for x in mesh.coord.reshape(-1)],
            'faces': [int(x) for x in mesh.fvert.reshape(-1)],
            'fgroup': [int(x) for x in mesh.group.reshape(-1)] if hasattr(mesh, 'group') else [],
            'groups': groups,
            'weights': weights,
        })
    return {'bones': bones, 'meshes': meshes, 'units': 'decimeter'}


def _run(app):
    import gui3d
    log_path = OUT + '.log'
    try:
        human = gui3d.app.selectedHuman
        for name, value in CFG.get('modifiers', {}).items():
            human.getModifier(name).setValue(value)
        human.applyAllTargets()
        data_dir = os.path.join(os.getcwd(), 'data')
        gui3d.app.getTask('Pose/Animate', 'Skeleton').chooseSkeleton(
            os.path.join(data_dir, 'rigs', CFG.get('skeleton', 'game_engine') + '.mhskel'))
        hair = CFG.get('hair')
        if hair:
            gui3d.app.getTask('Geometries', 'Hair').selectProxy(
                os.path.join(data_dir, 'hair', hair, hair + '.mhclo'))
        brows = CFG.get('eyebrows')
        if brows:
            gui3d.app.getTask('Geometries', 'Eyebrows').selectProxy(
                os.path.join(data_dir, 'eyebrows', brows, brows + '.mhclo'))
        for c in CFG.get('clothes', []):
            gui3d.app.getTask('Geometries', 'Clothes').selectProxy(
                os.path.join(data_dir, 'clothes', c, c + '.mhclo'))
        if CFG.get('noEyelashes'):
            gui3d.app.getTask('Geometries', 'Eyelashes').selectProxy(None)
        data = _dump(human)
        with open(OUT, 'w') as f:
            json.dump(data, f)
        with open(log_path, 'w') as f:
            f.write('ok %d bones, meshes: %s\n' % (len(data['bones']),
                    ', '.join('%s(%d verts)' % (m['name'], len(m['coord']) // 3) for m in data['meshes'])))
    except Exception:
        with open(log_path, 'w') as f:
            f.write(traceback.format_exc())
    finally:
        os._exit(0)


def load(app):
    if not OUT:
        return
    from PyQt5 import QtCore
    QtCore.QTimer.singleShot(14000, lambda: _run(app))


def unload(app):
    pass

