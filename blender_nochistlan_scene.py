import bpy, math
from mathutils import Vector

# Stylized but structurally legible reconstruction of the Nochistlan aqueduct.
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, roughness=.86):
    mat=bpy.data.materials.new(name); mat.diffuse_color=(*color,1); mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value=(*color,1); bsdf.inputs['Roughness'].default_value=roughness
    return mat

stone=material('Warm weathered cantera',(.49,.34,.22)); stone_light=material('Sunlit cut stone',(.66,.49,.32)); stone_dark=material('Recessed joints',(.25,.17,.11)); ground=material('Dry ochre earth',(.28,.19,.11)); road=material('Old stone road',(.35,.32,.27)); water=material('Aqueduct water',(.12,.34,.40),.25); green=material('Cypress green',(.07,.18,.10)); foliage=material('Olive foliage',(.22,.30,.14));

def cube(name, loc, scale, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); ob=bpy.context.object; ob.name=name; ob.dimensions=scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); ob.data.materials.append(mat)
    if bevel:
        mod=ob.modifiers.new('Soft worn edges','BEVEL'); mod.width=bevel; mod.segments=2
        ob.modifiers.new('Weighted stone normals','WEIGHTED_NORMAL')
    return ob

def mesh_obj(name, verts, faces, mat):
    mesh=bpy.data.meshes.new(name+' mesh'); mesh.from_pydata(verts,[],faces); mesh.materials.append(mat); mesh.update(); ob=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(ob); return ob

def arch_ring(name, xcenter, zbase, radius, thickness, yfront, depth, segments=20):
    # Semicircular stone ring as a solid extruded annulus. The opening remains clear.
    verts=[]
    for y in (yfront, yfront+depth):
        for r in (radius, radius+thickness):
            for i in range(segments+1):
                a=math.pi*i/segments
                verts.append((xcenter+r*math.cos(a),y,zbase+r*math.sin(a)))
    n=segments+1; faces=[]
    # front and back curved strips
    for i in range(segments):
        faces += [(i,i+1,n+i+1,n+i), (2*n+i,3*n+i,3*n+i+1,2*n+i+1)]
        # inner and outer curved sides
        faces += [(i,n+i, n+i+1, i+1), (2*n+i,2*n+i+1,3*n+i+1,3*n+i)]
    # end caps
    for i in (0,segments): faces.append((i,2*n+i,3*n+i,n+i))
    ob=mesh_obj(name,verts,faces,stone); ob.data.materials.append(stone_light)
    # voussoir seams traced by shallow radial joints on the visible face
    for k in range(1,9):
        a=math.pi*k/9; r0=radius+.035; r1=radius+thickness-.035
        p0=(xcenter+r0*math.cos(a),yfront-.012,zbase+r0*math.sin(a)); p1=(xcenter+r1*math.cos(a),yfront-.012,zbase+r1*math.sin(a))
        mid=Vector(p0).lerp(Vector(p1),.5); vec=Vector(p1)-Vector(p0)
        bpy.ops.mesh.primitive_cube_add(size=1, location=mid); seam=bpy.context.object; seam.name=f'{name} voussoir joint'; seam.dimensions=(.025,.018,vec.length); seam.rotation_euler[1]=-a; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); seam.data.materials.append(stone_dark)
    return ob

N=33
span=.92; radius=span/2; ring_t=.24; pier_w=.38; y=0; depth=.68; zbase=2.55
total=N*span+(N+1)*pier_w
xstart=-total/2
# terrain, approach road, and broad aqueduct footing
cube('Landscape',(0,1,-.38),(total+5,12,.75),ground)
cube('Road along the aqueduct',(0,-2,.04),(total+4,3.4,.12),road,.04)
cube('Continuous stone footing',(0,y,.22),(total+.7,1.25,.48),stone,.06)

for i in range(N):
    left=xstart+i*(span+pier_w); cx=left+pier_w+span/2
    # Piers support both arch springings; slightly wider base and capital add weight.
    cube(f'Pier {i+1:02d}',(cx,y,zbase/2),(pier_w,depth,zbase),stone,.035)
    cube(f'Pier base {i+1:02d}',(cx,y,.36),(pier_w+.16,depth+.12,.25),stone_light,.025)
    cube(f'Pier capital {i+1:02d}',(cx,y,zbase-.06),(pier_w+.12,depth+.12,.22),stone_light,.025)
    arch_ring(f'Arch {i+1:02d} of 33',cx,zbase,radius,ring_t,-depth/2,depth,24)
    # Small carved impost blocks make the transition from pier to arch readable.
    for side in (-1,1): cube(f'Impost {i+1:02d}',(cx+side*(radius+.025),y,zbase),( .19,depth+.08,.16),stone_light,.018)

# Parapet and open water channel above the arches.
top=zbase+radius+ring_t
cube('Aqueduct crown course',(0,y,top),(total+.55,depth+.22,.27),stone_light,.04)
cube('Raised channel bed',(0,y,top+.20),(total+.25,.48,.16),stone,.025)
cube('Water in channel',(0,y,top+.30),(total-.1,.34,.035),water)
cube('Far parapet',(0,.36,top+.42),(total+.4,.16,.32),stone,.025)
cube('Near parapet',(0,-.36,top+.42),(total+.4,.16,.32),stone,.025)

# End abutments and subtle masonry bands.
for side in (-1,1):
    xe=side*(total/2+.22)
    cube('End abutment',(xe,y,zbase+.5),(.78,1.05,zbase+1.0),stone,.05)
    cube('Abutment cap',(xe,y,top+.06),(.96,1.16,.22),stone_light,.035)
for z in (.62,1.18,1.78):
    cube(f'Horizontal masonry course {z}',(0,-depth/2-.015,z),(total-.2,.035,.045),stone_light)

# Sparse landscape details keep scale and setting without distracting from all 33 bays.
for i,(x,yy,h) in enumerate([(-total*.42,4,3.8),(-total*.31,5,4.7),(-total*.13,4.5,3.5),(total*.16,5,4.3),(total*.34,4.4,3.7),(total*.44,5.2,4.6)]):
    bpy.ops.mesh.primitive_cone_add(vertices=9, radius1=.7, radius2=.05, depth=h, location=(x,yy,h/2)); bpy.context.object.name=f'Cypress {i+1}'; bpy.context.object.data.materials.append(green)
for x,yy,s in [(-total*.48,8,4),(-total*.25,9,5),(0,10,4.5),(total*.25,9,5),(total*.47,8,4)]:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(x,yy,s*.28)); ob=bpy.context.object; ob.name='Low distant hill'; ob.scale=(s,2.2,s*.55); ob.data.materials.append(foliage)

world=bpy.data.worlds.new('Clear warm sky'); world.use_nodes=True; world.node_tree.nodes['Background'].inputs['Color'].default_value=(.30,.43,.58,1); world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65; bpy.context.scene.world=world
bpy.ops.object.light_add(type='SUN',location=(-total*.25,-total*.35,total*.55)); sun=bpy.context.object; sun.name='Late afternoon sun'; sun.data.energy=2.4; sun.rotation_euler=(math.radians(24),math.radians(-28),math.radians(-28))
bpy.ops.object.camera_add(location=(total*.24,-total*.92,total*.53)); cam=bpy.context.object; cam.name='Aqueduct overview camera'; target=Vector((0,0,top*.43)); cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=total*1.12; bpy.context.scene.camera=cam
s=bpy.context.scene; s.render.engine='BLENDER_EEVEE'; s.render.resolution_x=1800; s.render.resolution_y=760; s.render.resolution_percentage=100; s.render.image_settings.file_format='PNG'; s.render.resolution_percentage=100
s.render.filepath=r'C:\Users\survi\Downloads\New folder (175)\nochistlan-aqueduct-scene.png'
s.view_settings.view_transform='AgX'; s.camera.data.lens=50
bpy.ops.wm.save_as_mainfile(filepath=r'C:\Users\survi\Downloads\New folder (175)\nochistlan-aqueduct-scene.blend')
bpy.ops.render.render(write_still=True)
