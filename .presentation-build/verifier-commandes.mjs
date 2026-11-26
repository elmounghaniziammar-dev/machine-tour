import { createServer } from 'vite';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1123-915-0_26.1123.915.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/module.cjs')('playwright');
const server=await createServer({server:{host:'127.0.0.1'},logLevel:'error'});
await server.listen(); let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1120,height:700}}); page.setDefaultTimeout(45000);
 await page.route('**/src/main.js',async route=>{const res=await route.fetch(); const body=(await res.text()).replace('const clock = new THREE.Clock();','window.proj = name => { const p=machine.elements[name].getWorldPosition(new THREE.Vector3()); camera.updateMatrixWorld(); p.project(camera); const b=canvas.getBoundingClientRect(); return [b.left+(1+p.x)*b.width/2,b.top+(1-p.y)*b.height/2]; }; const clock = new THREE.Clock();');await route.fulfill({response:res,body});});
 await page.goto(server.resolvedUrls.local[0]); await page.waitForFunction(()=>typeof window.proj==='function' && !document.querySelector('#atelier').hidden);
 assert.equal(await page.locator('#atelier button,#atelier input,#atelier select').count(),0);
 async function act(key,name,title){await page.keyboard.press(key);await page.waitForTimeout(250);const [x,y]=await page.evaluate(n=>window.proj(n),name);for(const [dx,dy] of [[0,0],[4,0],[-4,0],[0,-8],[0,8],[8,8],[-9,-12],[-14,0],[0,18]]){await page.mouse.move(x+dx,y+dy);if((await page.locator('[role=tooltip]').isVisible())&&(await page.locator('[role=tooltip]').textContent()).includes(title)){await page.mouse.click(x+dx,y+dy);return;}}throw Error(name+' invisible at '+x+','+y);}
 const D=page.locator('#diametre-regle');let before=await D.textContent();await act('4','volantTransversal','Volant du transversal');await page.waitForFunction(v=>document.querySelector('#diametre-regle').textContent!==v,before);
 await act('2','levierDirection','Sens de la broche');await page.waitForFunction(()=>document.querySelector('#etat-coupe').textContent.includes('Marche avant'));
 await act('3','levierAvance','Levier d’avance longitudinale');await page.waitForFunction(()=>document.querySelector('#position-z').textContent.startsWith('-'));
 await act('3','levierAvance','Levier d’avance longitudinale');await page.waitForFunction(()=>document.querySelector('#embrayage').textContent==='Débrayée');
 console.log('Gestes 3D validés : '+before+' → '+await D.textContent()+' ; Z '+await page.locator('#position-z').textContent()+' ; '+await page.locator('#etat-coupe').textContent());
} finally { await browser?.close();await server.close(); }process.exit(0);
