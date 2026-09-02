const { exec } = require("child_process");
const os = require("os");

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function getPidsUsingPortWindows(port) {
  try {
    const { stdout } = await execPromise(
      `netstat -ano -p tcp | findstr :${port}`
    );

    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const pids = new Set();

    for (const line of lines) {
      const parts = line.split(/\s+/);
      const pid = Number(parts[parts.length - 1]);

      if (Number.isInteger(pid) && pid > 0) {
        pids.add(pid);
      }
    }

    return Array.from(pids);
  } catch (result) {
    /*
     * findstr devuelve código 1 cuando NO encuentra coincidencias.
     * Eso significa que el puerto está libre, no que haya ocurrido
     * un error real.
     */
    if (result?.error?.code === 1) {
      return [];
    }

    return [];
  }
}

async function getPidsUsingPortUnix(port) {
  try {
    const { stdout } = await execPromise(`lsof -ti tcp:${port}`);

    return stdout
      .split(/\r?\n/)
      .map((value) => Number(value.trim()))
      .filter(
        (value) => Number.isInteger(value) && value > 0
      );
  } catch {
    return [];
  }
}

async function killPidWindows(pid) {
  await execPromise(`taskkill /PID ${pid} /F`);
}

async function killPidUnix(pid) {
  await execPromise(`kill -9 ${pid}`);
}

async function freePort(port) {
  const platform = os.platform();
  const isWindows = platform === "win32";

  const pids = isWindows
    ? await getPidsUsingPortWindows(port)
    : await getPidsUsingPortUnix(port);

  if (!pids.length) {
    return [];
  }

  for (const pid of pids) {
    try {
      if (isWindows) {
        await killPidWindows(pid);
      } else {
        await killPidUnix(pid);
      }
    } catch (error) {
      console.warn(
        `[dev] Could not stop PID ${pid}: ${error.message}`
      );
    }
  }

  return pids;
}

module.exports = {
  freePort
};