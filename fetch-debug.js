async function main() {
  const res = await fetch('http://localhost:3000/api/debug2');
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
main();
