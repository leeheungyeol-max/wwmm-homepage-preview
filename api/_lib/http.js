function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    const maxBodyLength = 24_000_000;

    req.on("data", (chunk) => {
      if (tooLarge) {
        return;
      }

      body += chunk;
      if (body.length > maxBodyLength) {
        tooLarge = true;
        reject(new Error("Payload too large"));
      }
    });

    req.on("end", () => {
      if (tooLarge) {
        return;
      }

      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function requireMethod(req, res, methods) {
  if (methods.includes(req.method)) {
    return true;
  }

  res.setHeader("Allow", methods.join(", "));
  sendJson(res, 405, { ok: false, error: "Method not allowed" });
  return false;
}

module.exports = {
  readJson,
  requireMethod,
  sendJson
};
