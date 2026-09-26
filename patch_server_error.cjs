const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldCatch = `  } catch (error) {
    console.error("AI Onboarding Error:", error);
    res.status(500).json({ error: "Failed to process onboarding" });
  }`;

const newCatch = `  } catch (error: any) {
    console.error("AI Onboarding Error:", error);
    res.status(500).json({ error: \`Failed to process onboarding: \${error.message || "Unknown error"}\` });
  }`;

code = code.replace(oldCatch, newCatch);
fs.writeFileSync('server.ts', code);
