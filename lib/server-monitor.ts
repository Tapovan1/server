import { exec } from "child_process";
import { readFile } from "fs/promises";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

export async function getServerMetrics() {
  try {
    // Get CPU information
    const cpuInfo = os.cpus();
    const cpuCount = cpuInfo.length;

    // Get CPU usage (this is more complex on Linux)
    let cpuUsage = 0;
    try {
      const { stdout: loadAvg } = await execAsync("cat /proc/loadavg");
      const load = Number.parseFloat(loadAvg.split(" ")[0]);
      // Convert load average to percentage based on number of cores
      cpuUsage = Math.min(Math.round((load / cpuCount) * 100), 100);
    } catch (error) {
      // Fallback for non-Linux systems
      cpuUsage = Math.round(os.loadavg()[0] * 25); // Rough estimate
    }

    // Get memory information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = Math.round((usedMem / totalMem) * 100);
    const totalMemGB = (totalMem / (1024 * 1024 * 1024)).toFixed(1);
    const usedMemGB = (usedMem / (1024 * 1024 * 1024)).toFixed(1);

    // Get uptime
    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeDuration = `${days}d ${hours}h ${minutes}m`;

    // Calculate uptime percentage (assuming 30 days as 100%)
    const uptimePercentage = Math.min(
      Math.round((uptimeSeconds / (30 * 86400)) * 100),
      99.99
    );

    // Get temperature (Linux-specific, may not work on all systems)
    let tempValue = 0;
    let tempStatus = "normal";

    try {
      // Try different temperature sources
      let tempOutput;
      try {
        tempOutput = await readFile(
          "/sys/class/thermal/thermal_zone0/temp",
          "utf8"
        );
      } catch {
        try {
          const { stdout } = await execAsync(
            "sensors | grep 'Core 0' | awk '{print $3}' | sed 's/°C//' | sed 's/+//'"
          );
          tempOutput = stdout;
        } catch {
          tempOutput = "0";
        }
      }

      // Parse temperature value
      tempValue =
        Number.parseInt(tempOutput.trim()) / (tempOutput.length > 2 ? 1000 : 1);

      if (tempValue > 80) {
        tempStatus = "critical";
      } else if (tempValue > 70) {
        tempStatus = "warning";
      }
    } catch (error) {
      console.log("Could not read temperature:", error);
    }

    // Check nginx status
    let serverStatus = "online";
    let errorCode;
    let errorMessage;

    try {
      await execAsync("systemctl is-active --quiet nginx");
    } catch (error) {
      serverStatus = "error";
      errorCode = 502;
      errorMessage = "Bad Gateway";

      try {
        // Try to get more specific error information
        const { stdout } = await execAsync("systemctl status nginx --no-pager");
        if (stdout.includes("Failed to start")) {
          errorMessage = "Failed to start nginx service";
        }
      } catch {
        // Use default error message
      }
    }

    return {
      status: serverStatus,
      errorCode,
      errorMessage,
      uptime: {
        percentage: uptimePercentage,
        duration: uptimeDuration,
      },
      cpu: {
        usage: cpuUsage,
        cores: cpuCount,
        temperature: tempValue,
      },
      memory: {
        usage: memoryUsage,
        total: `${totalMemGB} GB`,
        used: `${usedMemGB} GB`,
      },
      temperature: {
        value: tempValue,
        status: tempStatus,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting server metrics:", error);
    throw error;
  }
}
