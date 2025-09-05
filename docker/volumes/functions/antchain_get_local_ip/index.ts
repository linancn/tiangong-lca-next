import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// import { corsHeaders } from '../_shared/cors.ts';
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Get local IP addresses
 * @returns An array of IP addresses
 */
async function getLocalIpAddresses(): Promise<string[]> {
  try {
    // Get network interfaces using Deno API
    const networkInterfaces = await Deno.networkInterfaces();

    // Filter for IPv4 addresses that aren't loopback addresses
    const ipAddresses = networkInterfaces
      .filter((ni) => ni.family === 'IPv4' && !ni.address.startsWith('127.'))
      .map((ni) => ni.address);

    return ipAddresses;
  } catch (error) {
    console.error('Error getting network interfaces:', error);
    return [];
  }
}

/**
 * Try to get external IP by making a request to an external service
 * @returns External IP or null if unable to determine
 */
async function getExternalIp(): Promise<string | null> {
  try {
    // Use ipify.org API to get external IP
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting external IP:', error);
    return null;
  }
}

/**
 * Get DNS servers
 * @returns Array of DNS servers or empty array if unable to determine
 */
async function getDnsServers(): Promise<string[]> {
  try {
    // Try to read /etc/resolv.conf to get DNS servers
    // This only works on Unix-like systems
    const file = await Deno.readTextFile('/etc/resolv.conf');
    const lines = file.split('\n');
    const dnsServers = lines
      .filter((line) => line.trim().startsWith('nameserver'))
      .map((line) => line.split(/\s+/)[1]);

    return dnsServers;
  } catch (error) {
    // This is expected to fail on Windows or in some environments
    return [];
  }
}

// Type for the request with optional remoteAddr
interface RequestWithRemoteAddr extends Request {
  remoteAddr?: {
    hostname: string;
    port: number;
  };
}

serve(async (req: RequestWithRemoteAddr) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const localIps = await getLocalIpAddresses();
    const externalIp = await getExternalIp();
    const dnsServers = await getDnsServers();

    // Get request information
    const requestInfo = {
      remoteAddr: req.remoteAddr?.hostname || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    };

    const responseData = {
      success: true,
      localIps,
      externalIp,
      dnsServers,
      requestInfo,
      environment: {
        runtime: Deno.version.deno,
        v8: Deno.version.v8,
        typescript: Deno.version.typescript,
      },
    };

    return new Response(JSON.stringify(responseData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
