import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { useState } from "react";
import { appendFileSync } from "fs";
function App(){
  const [n,setN]=useState(0);
  useKeyboard((k)=>{
    appendFileSync("/tmp/keys.log", `name=${JSON.stringify(k.name)} seq=${JSON.stringify(k.sequence)}\n`);
    setN(x=>x+1);
    if(n>=4) process.exit(0);
  });
  return <text>presses: {n}</text>;
}
const r=await createCliRenderer({exitOnCtrlC:true});
createRoot(r).render(<App/>);
