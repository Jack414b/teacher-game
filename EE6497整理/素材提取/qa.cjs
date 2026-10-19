const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
const root='G:/AAADocument/test/EE6497整理';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--disable-extensions','--allow-file-access-from-files']});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+root+'/学习导航.html#w4-k12');await page.waitForTimeout(1500);
 let b=await page.locator('#w4-k12').boundingBox();if(!b||b.y<60||b.y>350)throw Error('Knowledge jump '+JSON.stringify(b));
 await page.screenshot({path:root+'/素材提取/知识点核对.png'});
 await page.locator('#w4-notes a[href="#w4-s158"]').first().click();await page.waitForTimeout(1500);
 b=await page.locator('#w4-s158').boundingBox();if(!b||b.y<60||b.y>350)throw Error('Subtitle jump '+JSON.stringify(b));
 await page.screenshot({path:root+'/素材提取/字幕核对.png'});
 await page.locator('#w4-s158 a[href="#w4-k12"]').click();await page.waitForTimeout(1000);
 if(await page.locator('#w4-notes').isHidden())throw Error('Backlink failed');
 await page.locator('#query').fill('Baum');await page.locator('#searchform button').click();
 const count=await page.locator('.search-result').count();if(count<1)throw Error('No search results');
 await page.locator('.search-result').first().click();await page.waitForTimeout(1000);
 if(await page.locator('#results').isVisible())throw Error('Search not dismissed');
 for(let w=1;w<=4;w++){
  await page.locator(`.week[data-week="${w}"]`).click();await page.locator('.view[data-view="notes"]').click();await page.waitForTimeout(400);
  if(await page.locator(`#w${w}-notes`).isHidden())throw Error('Week switch '+w);
 }
 await page.setViewportSize({width:390,height:844});await page.goto('file:///'+root+'/学习导航.html');await page.waitForTimeout(1000);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);if(overflow)throw Error('Mobile horizontal overflow');
 await page.screenshot({path:root+'/素材提取/手机核对.png'});
 if(errors.length)throw Error(errors.join('\n'));
 const report={knowledge_jump:true,subtitle_jump:true,backlink:true,search_results:count,week_switches:4,mobile_no_overflow:true,javascript_errors:errors};
 fs.writeFileSync(root+'/素材提取/浏览核对.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
