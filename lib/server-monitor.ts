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
      // Try to get CPU temperature specifically
      try {
        // Method 1: Try to get Package id 0 temperature (most accurate for CPU)
        const { stdout } = await execAsync(
          "sensors | grep 'Package id 0' | awk '{print $4}' | sed 's/°C//' | sed 's/+//'"
        );
        tempValue = parseFloat(stdout.trim());
      } catch {
        try {
          // Method 2: Try to get Core 0 temperature
          const { stdout } = await execAsync(
            "sensors | grep 'Core 0' | head -n 1 | awk '{print $3}' | sed 's/°C//' | sed 's/+//'"
          );
          tempValue = parseFloat(stdout.trim());
        } catch {
          try {
            // Method 3: Try to get NVMe temperature
            const { stdout } = await execAsync(
              "sensors | grep 'Composite' | head -n 1 | awk '{print $2}' | sed 's/°C//' | sed 's/+//'"
            );
            tempValue = parseFloat(stdout.trim());
          } catch {
            // Method 4: Try gigabyte_wmi temperature
            const { stdout } = await execAsync(
              "sensors | grep 'temp1' | head -n 1 | awk '{print $2}' | sed 's/°C//' | sed 's/+//'"
            );
            tempValue = parseFloat(stdout.trim());
          }
        }
      }

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
      await execAsync("systemctl status nginx");
      console.log("nginx is running");
    } catch (error) {
      serverStatus = "error";
      errorCode = 502;
      errorMessage = "Bad Gateway";

      try {
        // Try to get more specific error information
        const { stdout } = await execAsync("systemctl status nginx --no-pager");
        console.log("nginx status output:", stdout);

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
