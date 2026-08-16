from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'src/app/ProjectNoclipGame.ts'
text=path.read_text()
old='      this.updateStreaming(false, targetRadius);\n'
new='      // Startup may fill the accepted active envelope eagerly; movement transitions stay budgeted.\n      this.updateStreaming(true, targetRadius);\n'
assert text.count(old)==1, text.count(old)
path.write_text(text.replace(old,new,1))
# Keep temporary harness out of candidate history snapshot.
for temp in [root/'scripts/_tmp_fix_streaming_startup.py', root/'.github/workflows/_tmp-fix-streaming-startup.yml']:
    if temp.exists(): temp.unlink()
