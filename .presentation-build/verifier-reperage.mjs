import { createServer } from 'vite';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1123-915-0_26.1123.915.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/module.cjs')('playwright');
const server=await createServer({server:{host:'127.0.0.1'},logLevel:'error'});
 let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1120,height:700}}); page.setDefaultTimeout(45000);
 console.log('navigation'); await page.goto('http://127.0.0.1:5174/'); await page.locator('#atelier').waitFor();
 async function act(key,name,title){
   console.log('localisation',key); const view={'2':'broche','3':'trainard','4':'tambour'}[key];
   await page.locator('[data-vue="'+view+'"]').click();
   await page.locator('#repere-commande').waitFor();
   await page.waitForTimeout(300);
   const r=await page.locator('#repere-commande').boundingBox();
   await page.mouse.move(r.x+r.width/2,r.y+r.height/2); 
   const t=await page.locator('[role=tooltip]').textContent();
   assert.ok(t.includes(title),title+' attendu, trouvé '+t);
   await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
 }
 const D=page.locator('#diametre-regle');let before=await D.textContent();await act('4','volantTransversal','Volant du transversal');await page.waitForFunction(v=>document.querySelector('#diametre-regle').textContent!==v,before);
 await act('2','levierDirection','Sens de la broche');await page.waitForFunction(()=>document.querySelector('#etat-coupe').textContent.includes('Marche avant'));
 await act('3','levierAvance','Levier d’avance longitudinale');await page.waitForFunction(()=>document.querySelector('#position-z').textContent.startsWith('-'));
 await act('3','levierAvance','Levier d’avance longitudinale');await page.waitForFunction(()=>document.querySelector('#embrayage').textContent==='Débrayée');
 console.log('Gestes 3D validés : '+before+' → '+await D.textContent()+' ; Z '+await page.locator('#position-z').textContent()+' ; '+await page.locator('#etat-coupe').textContent());
} catch(e){ console.error(e);process.exitCode=1;throw e; } finally { await browser?.close(); }process.exit(0);
