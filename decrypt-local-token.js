const { decode } = require('next-auth/jwt');
require('@next/env').loadEnvConfig(process.cwd());

async function run() {
  // Use the session token from the local sign-in response in task-7565
  const localToken = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoieFcxMlp3bEdtSlM3Xy1oMGxUeGdxOFlqQk5VVlRlVFp2V1ZRMzNtenc0cDktVDRFWFlEcjB0VTRrOUtabHpMMXlSYkVqQ3BmZVJSVlpja0hoWFlkZVEifQ..PXhiQroAK5jip2gHpvi1GA.uSl_adLx3bUIpRE-e-e-IlTsl6Wl12sMb_MDJjGUYrvCDmWko_bUrATCeI3XwzlZUBlxw1vKhyOL9ZI5rU41nJpiDXrEGV14qNO3Ps3P7tXhkyurnSE-A532Hn8-QSivipJxEWzQX-5u6QWdarwFYlwk-vpaHm7Xegvwkzlvs06vomhyGOKSUbIgxWryvwaCr20u9rQq9xLYY5QHZ1zg4BrT7dQeUs5zywBxDdnmAFaAYunUFxqGvAlXcZAXBX0XYyNSO5LNHH3sj2PkG2WOcQ.pWD9i1Nijpr_Pu-SqaUEwvD1RvOI9BF2O_hIdX-Ga1s';
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    console.error("AUTH_SECRET not found!");
    return;
  }

  try {
    const decoded = await decode({
      token: localToken,
      secret: secret,
      salt: 'authjs.session-token' // dev mode uses plain name salt
    });

    console.log("--- DECRYPTED LOCAL JWT CONTENT ---");
    console.log(JSON.stringify(decoded, null, 2));
  } catch (err) {
    console.error("Failed to decrypt local token:", err.message);
  }
}

run().catch(console.error);
