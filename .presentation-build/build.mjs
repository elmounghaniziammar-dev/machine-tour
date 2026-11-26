import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const rt='C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1123-915-0_26.1123.915.0_x64__3k8sg7r9htsxt/dependencies', skill='C:/Users/zakaria achbani/.codex/plugins/cache/openai-primary-runtime/presentations/26.1123.11515/skills/presentations';
process.env.RUNTIME_NODE_MODULES=rt+'/node/node_modules';
const req=createRequire(rt+'/node/node_modules/module.cjs');
const {Presentation,PresentationFile}=await import(pathToFileURL(req.resolve('@oai/artifact-tool')).href);
const sharp=req('sharp');
const p=Presentation.create({slideSize:{width:1280,height:720}});
const dir=path.resolve('.presentation-build'),base=process.cwd();
await fs.mkdir('presentation',{recursive:true}); const out=path.resolve('presentation/Présentation du tour parallèle.pptx');
const bg='#F6F5EF',ink='#172F31',accent='#146456',muted='#365654';
function text(s,str,x,y,w,h,size,opts={}){
 const sh=s.shapes.add({name:opts.name||str.slice(0,45),geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 sh.text=str;sh.text.style={typeface:'Arial',fontSize:size,bold:!!opts.bold,color:opts.color||ink,insets:{left:0,right:0,top:0,bottom:0},verticalAlignment:'top',wrap:'square'};return sh;
}
function slide(section,title,notes){const s=p.slides.add();s.background.fill=bg;text(s,section,62,43,1135,28,20,{bold:true,color:accent});text(s,title,60,93,1160,80,46,{bold:true});s.speakerNotes.text=notes;return s;}
function pair(s,label,body,x,y,w){text(s,label,x,y,w,40,29,{bold:true,color:accent});text(s,body,x,y+46,w,112,25);}
function foot(s,str){text(s,str,62,652,1160,44,19,{color:muted});}
async function pic(s,file,x,y,w,h,crop,alt){
 let img=sharp(file);if(crop)img=img.extract(crop);const b=await img.resize(Math.round(w),Math.round(h),{fit:'contain',background:bg}).png().toBuffer();
 s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt:alt||path.basename(file),position:{left:x,top:y,width:w,height:h}});
}
const detail=path.resolve('apercu-chariotage-longitudinal.jpg'),photo=path.resolve('src/assets/reference-sn40.png'),panel=path.resolve('apercu-plaque-sn40.jpg');
const cropDetail={left:295,top:10,width:975,height:650};
const choose=async f=>fs.access(path.join(dir,f)).then(()=>path.join(dir,f)).catch(()=>null);
const whole=await choose('ensemble.jpg'),carriage=await choose('trainard.jpg'),dial=await choose('tambour.jpg'),cut=await choose('coupe.jpg');
{
 const s=p.slides.add();s.background.fill=bg;
 text(s,'SIMULATION DE CHARIOTAGE EXTÉRIEUR',60,56,1170,40,22,{bold:true,color:accent});
 text(s,'Le tour parallèle',60,172,590,85,63,{bold:true});
 text(s,'Comment obtenir un cylindre de Ø 36 mm à partir d’un brut de Ø 40 mm ?',62,275,508,165,35);
 text(s,'1   Machine en 3D\n2   Mécanique et chariotage\n3   Commandes et intégration',62,475,550,156,27,{color:accent});
 await pic(s,whole||detail,605,125,635,462,whole?undefined:cropDetail,'Tour parallèle simulé');
 s.speakerNotes.text='La démonstration porte sur une seule opération, le chariotage extérieur. La surface recherchée est cylindrique. Le projet représente un tour parallèle générique dont le panneau de réglage s’inspire de la photographie du TRÈNS SN40. Source : README.md et vues du projet.';
}
{
 const s=slide('1   MACHINE EN 3D','Le montage de la pièce','Le mandrin transmet la rotation de la broche au brut. La pointe tournante entre dans le trou de centre préparé à 60°. Le fourreau se verrouille après la mise en appui. Les 120 mm correspondent à la course d’usinage prévue pour ce montage. Sources : README.md, Machine.js, Mandrin.js et PoupeeMobile.js.');
 await pic(s,cut||detail,53,195,665,400,cut?undefined:cropDetail,'Zone du mandrin, de la pièce et de la contre-pointe');
 pair(s,'Côté mandrin','Les mors serrent le brut de Ø 40 × 150 mm. La broche entraîne le mandrin et la pièce.',753,195,467);
 pair(s,'Côté contre-pointe','Le fourreau avance jusqu’au trou de centre. Une fois verrouillé, il maintient l’appui à droite.',753,390,467);
 foot(s,'Sur ce montage, 120 mm de longueur sont prévus pour le chariotage.');
}
{
 const s=slide('1   MACHINE EN 3D','Les axes du porte-outil','Le traînard porte le transversal et le porte-outil. Quand le traînard avance, tout cet ensemble le suit. Les noms X et Z sont ici les repères métier du tour. Le moteur 3D représente le banc suivant son axe X interne. Sources : Machine.js, Trainard.js, Chariots.js, Deplacements.js.');
 pair(s,'Z · déplacement longitudinal','Le traînard glisse le long du banc. Pendant la passe, il emporte l’outil de la face droite vers le mandrin.',62,205,540);
 pair(s,'X · déplacement transversal','Le volant rapproche ou éloigne la pointe de l’outil de l’axe de rotation. Ce mouvement règle le rayon à usiner.',62,421,540);
 await pic(s,carriage||detail,650,185,570,410,carriage?undefined:cropDetail,'Chariots et porte-outil');
}
{
 const s=slide('2   MÉCANIQUE ET CHARIOTAGE','La profondeur de passe se règle au rayon','À la tangence, le bec vient juste effleurer la surface du brut. Sur le tambour radial du simulateur, une division vaut 0,05 mm, soit 0,10 mm sur le diamètre d’une surface entièrement usinée. Pour une pénétration de 2 mm, il faut 40 divisions. Sources : Limites.js, ProfilPiece.js et README.md.');
 text(s,'Ø 40 → Ø 36 mm',60,208,690,90,61,{bold:true,color:accent});
 text(s,'La réduction de diamètre vaut 4 mm. L’outil avance de la moitié de cette valeur vers l’axe.',62,327,555,155,30);
 text(s,'Profondeur de passe = (40 − 36) / 2 = 2 mm',62,530,1160,75,36,{bold:true});
 if(dial)await pic(s,dial,687,194,530,290,undefined,'Tambour transversal gradué');else text(s,'40 divisions\nde 0,05 mm',707,242,450,210,45,{bold:true,color:muted}); 
}
{
 const s=slide('2   MÉCANIQUE ET CHARIOTAGE','La rotation détermine la vitesse d’avance','Le régime n est exprimé en tours par minute et f en millimètres par tour. La multiplication donne des millimètres par minute. Le temps théorique concerne le parcours de 120 mm à vitesse constante. L’approche, la prise de profondeur et les manœuvres ajoutent du temps. Sources : Broche.js et README.md.');
 text(s,'250 tr/min  ×  0,10 mm/tr  =  25 mm/min',62,215,1160,95,52,{bold:true,color:accent});
 pair(s,'Un tour de pièce','Avec l’avance enclenchée, le traînard parcourt 0,10 mm à chaque tour de broche.',62,385,510);
 pair(s,'Un parcours de 120 mm','À régime constant, 120 / 25 = 4,8 minutes, soit 4 min 48 s hors approche.',671,385,522);
 foot(s,'Avec la broche seule, la pièce tourne ; le mouvement automatique en Z exige l’embrayage de l’avance.'.replace(' ;',' et'));
}
{
 const s=slide('2   MÉCANIQUE ET CHARIOTAGE','Le contact produit la surface et les copeaux','Le code échantillonne la pièce tous les 0,25 mm suivant son axe et en 48 secteurs autour de la broche. L’arête balaie les secteurs qui défilent devant elle. Le volume enlevé est la somme des différences locales de volume. La représentation des copeaux est géométrique et leur forme est illustrative. Sources : ProfilPiece.js, Coupe.js et Copeaux.js.');
 await pic(s,detail,57,190,615,397,cropDetail,'Capture du simulateur montrant la surface usinée et les copeaux');
 pair(s,'Avant le contact','Le traînard peut avancer dans le vide. Le volume enlevé reste nul.',710,195,505);
 pair(s,'Dans la matière','À chaque passage de l’arête, le rayon local diminue. Le volume retiré détermine la quantité de copeaux affichée.',710,378,505);
 foot(s,'Le modèle décrit la matière enlevée à la pièce. L’usure progressive de la plaquette demanderait un modèle distinct.');
}
{
 const s=slide('3   COMMANDES ET INTÉGRATION','Réglages du panneau et du tambour','La photo fournie sert de référence pour les régimes de broche lisibles. Une cellule masquée reste vide dans PlaqueSN40.js. La valeur de 0,10 mm/tr est un réglage du simulateur. Le tambour y compte 100 divisions par tour, soit 5 mm de course radiale. La remise à zéro change la lecture, sans mouvement de la pointe. Sources : photo fournie, PlaqueSN40.js, Limites.js et PanneauUsinage.js.');
 await pic(s,photo,57,182,425,435,{left:179,top:55,width:402,height:614},'Photographie fournie du panneau TRÈNS SN40');
 pair(s,'Choisir le régime et l’avance','Pour l’exemple, sélectionner 250 tr/min et 0,10 mm/tr. Les régimes proviennent des valeurs lisibles sur la plaque SN40.',530,194,675);
 pair(s,'Prendre une référence manuelle','Tangenter le brut, puis mettre la bague à zéro. Le bec reste en place. Une division correspond à 0,05 mm de déplacement radial.',530,405,675);
}
{
 const s=slide('3   COMMANDES ET INTÉGRATION','Conduite manuelle et passe guidée','En conduite manuelle, la broche peut tourner seule. L’utilisateur choisit où engager l’avance, en respectant les dégagements. Pour la passe guidée, le simulateur connaît la géométrie du brut. Il vérifie les conditions du montage, rejoint la face droite, prend la profondeur hors matière puis entraîne le traînard. La recherche d’une tangence exacte ne conditionne donc pas le lancement guidé. Sources : Broche.js, InteractionLevier.js et README.md.');
 pair(s,'Aux commandes du tour','Démarrer la broche, placer l’outil et régler la profondeur hors matière. Embrayer l’avance Z pour déplacer le traînard.',62,205,535);
 pair(s,'Avec « Lancer le chariotage »','Saisir 4 mm à enlever et mettre la contre-pointe en appui. Depuis une position dégagée, le cycle rejoint le départ et prend la passe.',667,205,535);
 text(s,'Arrêt de la passe guidée',62,447,1100,49,33,{bold:true,color:accent});
 text(s,'Au bout des 120 mm usinables, le traînard s’arrête avant les mors. La broche continue de tourner. Le levier permet aussi de débrayer plus tôt.',62,507,1100,118,29);
}
{
 const s=slide('3   COMMANDES ET INTÉGRATION','Du levier à l’image affichée','Le levier 3D et le bouton du panneau agissent sur le même état. À chaque image, main.js calcule le temps écoulé et appelle la mécanique. La surface, les copeaux puis les mesures sont actualisés. Les tests couvrent notamment les commandes, l’avance longitudinale, le tambour et l’usinage. Sources : main.js, PanneauUsinage.js, Selection.js, Broche.js, Coupe.js, Piece.js, Copeaux.js et dossier test/.');
 const rows=[['1','Commande','Le levier 3D ou le bouton du panneau engage l’avance.'],['2','Calcul mécanique','Le régime et l’avance donnent le déplacement en Z. L’arête retire la matière rencontrée.'],['3','Affichage','À chaque image, la pièce change de forme, les copeaux apparaissent et les mesures se mettent à jour.']];
 rows.forEach(([n,t,b],i)=>{const y=205+i*135;text(s,n,62,y,65,65,40,{bold:true,color:accent});text(s,t,142,y,332,62,32,{bold:true});text(s,b,507,y,694,103,27);});
}
{
 const s=slide('3   COMMANDES ET INTÉGRATION','Contrôle du résultat de la passe','Pour un cylindre idéal, V = π × 120 × (40² − 36²) / 4 = 28 651,3 mm³, soit 28,65 cm³. Le profil réellement balayé inclut les zones d’entrée et de sortie et la géométrie de l’arête. La valeur calculée est une référence théorique, pas une mesure issue d’un essai. Le diamètre derrière le bec renseigne sur la section après finition. Sources : ProfilPiece.js, Coupe.js, PanneauUsinage.js et README.md.');
 text(s,'Ø 36 mm',62,207,535,92,62,{bold:true,color:accent});text(s,'Diamètre attendu sur la zone cylindrique terminée. Lire « Ø derrière le bec » après le passage de l’arête.',62,327,520,188,29);
 text(s,'28,65 cm³',666,207,530,92,62,{bold:true,color:accent});text(s,'Volume théorique retiré pour 120 mm entièrement ramenés de Ø 40 à Ø 36 mm.',667,327,530,180,29);
 text(s,'V = π × longueur × (diamètre initial² − diamètre final²) / 4',62,560,1160,60,31,{bold:true});
 foot(s,'La forme de l’arête et les extrémités de passe peuvent faire varier le volume mesuré.');
}
const candidate=path.join(dir,'draft.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);
for(const [i,s] of p.slides.items.entries()){const data=await p.export({slide:s,format:'png',scale:1});await fs.writeFile(path.join(dir,'slide-'+String(i+1).padStart(2,'0')+'.png'),new Uint8Array(await data.arrayBuffer()));}
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
await finalizePresentation({workspaceDir:base,candidatePath:candidate,finalPath:out,pythonExecutable:rt+'/python/python.exe',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(dir,'validation.json')});console.log(out);
