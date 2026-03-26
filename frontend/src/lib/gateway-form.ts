import { gatewaysStatusApiV1GatewaysStatusGet } from "@/api/generated/gateways/gateways";

/**
 * 检测当前 workspace 名称
 * 从当前工作目录路径中提取，如 ~/.openclaw/workspace-be -> workspace-be
 */
function detectCurrentWorkspace(): string | null {
  // 尝试从环境变量获取
  if (process.env.NEXT_PUBLIC_WORKSPACE_NAME) {
    return process.env.NEXT_PUBLIC_WORKSPACE_NAME;
  }

  // 尝试从当前工作目录路径解析
  // 工作目录格式: /Users/admin/.openclaw/workspace-{name}
  const cwd = typeof process !== "undefined" ? process.cwd() : "";
  const match = cwd.match(/workspace-(\w+)$/);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * 获取默认的 workspace root 路径
 * 支持多 workspace 场景，根据当前 workspace 自动调整默认路径
 */
export function getDefaultWorkspaceRoot(): string {
  const workspaceName = detectCurrentWorkspace();

  if (workspaceName) {
    // 如果检测到 workspace 名称，使用对应的 workspace 路径
    return `~/.openclaw/${workspaceName}`;
  }

  // 默认使用 ~/.openclaw
  return "~/.openclaw";
}

// 导出默认 workspace root（保持向后兼容）
export const DEFAULT_WORKSPACE_ROOT = getDefaultWorkspaceRoot();

export type GatewayCheckStatus = "idle" | "checking" | "success" | "error";

/**
 * Returns true only when the URL string contains an explicit ":port" segment.
 *
 * JavaScript's URL API sets `.port` to "" for *both* an omitted port and a
 * port that equals the scheme's default (e.g. 443 for wss:). We therefore
 * inspect the raw host+port token from the URL string instead.
 */
function hasExplicitPort(urlString: string): boolean {
  try {
    // Extract the authority portion (between // and the first / ? or #)
    const withoutScheme = urlString.slice(urlString.indexOf("//") + 2);
    const authority = withoutScheme.split(/[/?#]/)[0];
    if (!authority) {
      return false;
    }

    // authority may be:
    // - host[:port]
    // - [ipv6][:port]
    // - userinfo@host[:port]
    // - userinfo@[ipv6][:port]
    const atIndex = authority.lastIndexOf("@");
    const hostPort = atIndex === -1 ? authority : authority.slice(atIndex + 1);

    let portSegment = "";
    if (hostPort.startsWith("[")) {
      const closingBracketIndex = hostPort.indexOf("]");
      if (closingBracketIndex === -1) {
        return false;
      }
      portSegment = hostPort.slice(closingBracketIndex + 1);
    } else {
      const lastColonIndex = hostPort.lastIndexOf(":");
      if (lastColonIndex === -1) {
        return false;
      }
      portSegment = hostPort.slice(lastColonIndex);
    }

    if (!portSegment.startsWith(":") || !/^:\d+$/.test(portSegment)) {
      return false;
    }

    const port = Number.parseInt(portSegment.slice(1), 10);
    return Number.isInteger(port) && port >= 0 && port <= 65535;
  } catch {
    return false;
  }
}

export const validateGatewayUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Gateway URL is required.";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "ws:" && url.protocol !== "wss:") {
      return "Gateway URL must start with ws:// or wss://.";
    }
    if (!hasExplicitPort(trimmed)) {
      return "Gateway URL must include an explicit port.";
    }
    return null;
  } catch {
    return "Enter a valid gateway URL including port.";
  }
};

export async function checkGatewayConnection(params: {
  gatewayUrl: string;
  gatewayToken: string;
  gatewayDisableDevicePairing: boolean;
  gatewayAllowInsecureTls: boolean;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const requestParams: {
      gateway_url: string;
      gateway_token?: string;
      gateway_disable_device_pairing: boolean;
      gateway_allow_insecure_tls: boolean;
    } = {
      gateway_url: params.gatewayUrl.trim(),
      gateway_disable_device_pairing: params.gatewayDisableDevicePairing,
      gateway_allow_insecure_tls: params.gatewayAllowInsecureTls,
    };
    if (params.gatewayToken.trim()) {
      requestParams.gateway_token = params.gatewayToken.trim();
    }

    const response = await gatewaysStatusApiV1GatewaysStatusGet(requestParams);
    if (response.status !== 200) {
      return { ok: false, message: "Unable to reach gateway." };
    }
    const data = response.data;
    if (!data.connected) {
      return { ok: false, message: data.error ?? "Unable to reach gateway." };
    }
    return { ok: true, message: "Gateway reachable." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to reach gateway.",
    };
  }
}
