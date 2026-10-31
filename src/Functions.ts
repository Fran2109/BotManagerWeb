// functions.ts - Funciones API en TypeScript
import axios, { AxiosError, AxiosResponse } from "axios";
import { BotInput, BotContentResponse } from './types';
import { AA_COMMUNITY_URL, AA_COMMUNITY2_URL, USER_FRANCISCO1, USER_FRANCISCO3, USER_FRANCISCO4, CALLBACK_URL, DEFAULT_PASSWORD as ENV_DEFAULT_PASSWORD } from '@env';

// Interfaces
interface LoginData {
    token: string;
}

interface LoginParams {
    username: string;
    password: string;
}

interface FilesFilter {
    operator: string;
    field: string;
    value: string;
}

interface FilesSort {
    field: string;
    direction: string;
}

interface FilesPage {
    offset: number;
    length: number;
}

interface FilesParams {
    fields: string[];
    filter: FilesFilter;
    sort: FilesSort[];
    page: FilesPage;
}

interface FileItem {
    id: string;
    name: string;
}

interface FilesData {
    list: FileItem[];
}

interface UsersParams {
    fields: string[];
    filter: Record<string, any>;
}

interface UserItem {
    id: string;
}

interface UsersData {
    list: UserItem[];
}

interface DeviceStatusParams {
    filter: Record<string, any>;
}

export interface DeviceItem {
    id: string;
    status: string;
}

interface DeviceStatusData {
    list: DeviceItem[];
}

interface CallbackInfo {
    url: string;
    headers: {
        "X-Authorization": string;
    };
}

interface DeployParams {
    fileId: string;
    runAsUserIds: string[];
    poolIds: string[];
    overrideDefaultDevice: boolean;
    callbackInfo: CallbackInfo;
    botInput: BotInput;
    hideBotAgentUi: boolean;
}

interface DeployData {
    deploymentId: string;
}

interface DeployStatusFilter {
    operator: string;
    field: string;
    value: string;
}

interface DeployStatusParams {
    filter: DeployStatusFilter;
}

interface DeployStatusItem {
    status: string;
    fileName: string;
    currentBotName: string;
    currentLine: number;
    totalLines: number;
    command: string;
}

interface DeployStatusData {
    list: DeployStatusItem[];
}

// Constants
export const DEFAULT_PASSWORD = ENV_DEFAULT_PASSWORD;

const tokenByUser = new Map<string, string>();
const userIdByUser = new Map<string, string>();
const deviceItemByUser = new Map<string, DeviceItem>();

const clearIdentityCaches = (userEmail: string): void => {
    userIdByUser.delete(userEmail);
    deviceItemByUser.delete(userEmail);
};

export const invalidateCachedUserId = (userEmail: string): void => {
    userIdByUser.delete(userEmail);
};

export const invalidateCachedDevice = (userEmail: string): void => {
    deviceItemByUser.delete(userEmail);
};

export const getCachedPrimaryDevice = (userEmail: string): DeviceItem | undefined => {
    return deviceItemByUser.get(userEmail);
};

export const invalidateUserToken = (username: string): void => {
    tokenByUser.delete(username);
    clearIdentityCaches(username);
};

const isAuthenticationRequest = (url: string | undefined): boolean => {
    return !!url && url.includes("authentication");
};

const patchDeployCallbackToken = (data: unknown, newToken: string): void => {
    if (!data || typeof data !== "object") {
        return;
    }
    const d = data as DeployParams;
    if (d.callbackInfo?.headers) {
        d.callbackInfo.headers["X-Authorization"] = newToken;
    }
};

let authInterceptorRegistered = false;

const registerAuthRetryInterceptor = (): void => {
    if (authInterceptorRegistered) {
        return;
    }
    authInterceptorRegistered = true;
    // Resolve the Control Room per request: axios.defaults.baseURL is global and is
    // overwritten whenever another user's token is requested, so concurrent calls for
    // different users could otherwise hit the wrong server.
    axios.interceptors.request.use((cfg) => {
        if (cfg._userEmail) {
            cfg.baseURL = getBaseURLByUsername(cfg._userEmail);
        }
        return cfg;
    });
    axios.interceptors.response.use(
        (r) => r,
        async (error: AxiosError) => {
            const cfg = error.config;
            if (!cfg) {
                return Promise.reject(error);
            }
            if (cfg._retry || !cfg._userEmail) {
                return Promise.reject(error);
            }
            if (isAuthenticationRequest(cfg.url)) {
                return Promise.reject(error);
            }
            const status = error.response?.status;
            if (status !== 401 && status !== 403) {
                return Promise.reject(error);
            }
            cfg._retry = true;
            // Logging in again invalidates the user's previous token. If another request
            // already refreshed it since this one was sent, retry with that token instead
            // of logging in again (which would invalidate it in turn).
            const usedToken = (cfg.headers as Record<string, string> | undefined)?.["X-Authorization"];
            const currentToken = tokenByUser.get(cfg._userEmail);
            const canReuseToken = !!currentToken && currentToken !== usedToken;
            if (!canReuseToken) {
                invalidateUserToken(cfg._userEmail);
            }
            try {
                const newToken = canReuseToken
                    ? currentToken!
                    : await getToken(cfg._userEmail, DEFAULT_PASSWORD, true);
                cfg.headers = cfg.headers || {};
                (cfg.headers as Record<string, string>)["X-Authorization"] = newToken;
                patchDeployCallbackToken(cfg.data, newToken);
                return axios.request(cfg);
            } catch (e) {
                return Promise.reject(e);
            }
        }
    );
};

const getBaseURLByUsername = (username: string): string => {
    switch (username) {
        case USER_FRANCISCO1:
        case USER_FRANCISCO4:
            return AA_COMMUNITY_URL;
        case USER_FRANCISCO3:
            return AA_COMMUNITY2_URL;
        default:
            throw new Error("User not implemented");
    }
};

// Configurar baseURL según el usuario
const configureBaseURL = (username: string): void => {
    axios.defaults.baseURL = getBaseURLByUsername(username);
};

// Concurrent logins for the same user invalidate each other's tokens, so callers
// that ask while a login is in flight share it.
const tokenRequestByUser = new Map<string, Promise<string>>();

export const getToken = async (username: string, password: string, forceRefresh = false): Promise<string> => {
    const inFlight = tokenRequestByUser.get(username);
    if (inFlight) {
        configureBaseURL(username);
        return inFlight;
    }
    const request = requestToken(username, password, forceRefresh);
    tokenRequestByUser.set(username, request);
    try {
        return await request;
    } finally {
        tokenRequestByUser.delete(username);
    }
};

const requestToken = async (username: string, password: string, forceRefresh: boolean): Promise<string> => {
    if (!forceRefresh) {
        const cached = tokenByUser.get(username);
        if (cached) {
            configureBaseURL(username);
            return cached;
        }
    } else {
        tokenByUser.delete(username);
        clearIdentityCaches(username);
    }
    const baseURL = getBaseURLByUsername(username);
    configureBaseURL(username);

    const parametrosLogin: LoginParams = {
        username: username,
        password: password,
    };
    try {
        const { data: loginData }: AxiosResponse<LoginData> = await axios.post(
            `${baseURL}v2/authentication`,
            parametrosLogin
        );
        tokenByUser.set(username, loginData.token);
        return loginData.token;
    } catch (error: any) {
        console.error('Error getting token:', error.response?.data || error.message);
        throw error;
    }
};

registerAuthRetryInterceptor();

export const getTaskId = async (taskName: string, token: string, userEmail: string): Promise<string> => {
    const parametrosFiles: FilesParams = {
        fields: [""],
        filter: {
            operator: "eq",
            field: "name",
            value: taskName,
        },
        sort: [
            {
                field: "name",
                direction: "asc",
            },
        ],
        page: {
            offset: 0,
            length: 0,
        },
    };

    try {
        const { data: filesData }: AxiosResponse<FilesData> = await axios.post(
            "v2/repository/workspaces/private/files/list",
            parametrosFiles,
            {
                headers: { "X-Authorization": token },
                _userEmail: userEmail,
            }
        );

        if (!filesData.list || filesData.list.length === 0) {
            throw new Error(`Task not found: ${taskName}`);
        }

        return filesData.list[0].id;
    } catch (error: any) {
        console.error('Error getting taskId:', error.response?.data || error.message);
        throw error;
    }
};

// Check if a bot exists in the specified user's Control Room
export const checkBotExists = async (botName: string, userEmail: string): Promise<{ exists: boolean; taskId?: string }> => {
    try {
        // Configure the base URL for the user
        configureBaseURL(userEmail);
        
        // Get token for the user using the correct password
        const token = await getToken(userEmail, DEFAULT_PASSWORD);
        
        // Try to get the task ID - if it exists, it will return the ID, if not it will throw an error
        const taskId = await getTaskId(botName, token, userEmail);
        
        return {
            exists: true,
            taskId: taskId
        };
    } catch (error: any) {
        console.error(`Bot "${botName}" not found in ${userEmail}'s Control Room:`, error.message);
        return {
            exists: false
        };
    }
};

export const getUserId = async (token: string, userEmail: string, forceRefresh = false): Promise<string> => {
    if (!forceRefresh) {
        const cached = userIdByUser.get(userEmail);
        if (cached) {
            return cached;
        }
    } else {
        userIdByUser.delete(userEmail);
    }
    configureBaseURL(userEmail);
    const parametroUsers: UsersParams = {
        fields: [],
        filter: {},
    };

    try {
        const { data: usersData }: AxiosResponse<UsersData> = await axios.post(
            "v2/usermanagement/users/list",
            parametroUsers,
            {
                headers: { "X-Authorization": token },
                _userEmail: userEmail,
            }
        );

        if (!usersData.list || usersData.list.length === 0) {
            throw new Error("No users found");
        }

        const id = usersData.list[0].id;
        userIdByUser.set(userEmail, id);
        return id;
    } catch (error: any) {
        console.error('Error getting userId:', error.response?.data || error.message);
        throw error;
    }
};

const fetchPrimaryDeviceList = async (token: string, userEmail: string): Promise<DeviceItem[]> => {
    configureBaseURL(userEmail);
    const baseURL = getBaseURLByUsername(userEmail);
    const parametrosStatus: DeviceStatusParams = {
        filter: {}
    };
    const { data: statusData }: AxiosResponse<DeviceStatusData> = await axios.post(
        `${baseURL}v2/devices/list`,
        parametrosStatus,
        {
            headers: { "X-Authorization": token },
            _userEmail: userEmail,
        }
    );
    return statusData.list || [];
};

export const getDeviceStatus = async (username: string, token: string): Promise<string> => {
    try {
        const list = await fetchPrimaryDeviceList(token, username);
        if (!list.length) {
            deviceItemByUser.delete(username);
            return "NO_DEVICE";
        }
        deviceItemByUser.set(username, list[0]);
        return list[0].status;
    } catch (error: any) {
        console.error('Error getting device status:', error.response?.data || error.message);
        throw error;
    }
};

export const getDeviceInfo = async (token: string, userEmail: string, forceRefresh = false): Promise<DeviceItem> => {
    if (!forceRefresh) {
        const cached = deviceItemByUser.get(userEmail);
        if (cached) {
            return cached;
        }
    } else {
        deviceItemByUser.delete(userEmail);
    }

    try {
        const list = await fetchPrimaryDeviceList(token, userEmail);
        if (!list.length) {
            throw new Error("No devices found");
        }
        deviceItemByUser.set(userEmail, list[0]);
        return list[0];
    } catch (error: any) {
        console.error('Error getting device info:', error.response?.data || error.message);
        throw error;
    }
};

export const deployBot = async (
    taskId: string,
    userId: string,
    token: string,
    botInput: BotInput,
    userEmail: string,
    hideBotAgentUi = false
): Promise<string> => {
    const parametroDeploy: DeployParams = {
        fileId: taskId,
        runAsUserIds: [userId],
        poolIds: [],
        overrideDefaultDevice: false,
        callbackInfo: {
            url: CALLBACK_URL,
            headers: {
                "X-Authorization": `${token}`,
            },
        },
        botInput: botInput,
        hideBotAgentUi,
    };

    try {
        const { data: deployData }: AxiosResponse<DeployData> = await axios.post(
            "v3/automations/deploy",
            parametroDeploy,
            {
                headers: { "X-Authorization": token },
                _userEmail: userEmail,
            }
        );
        return deployData.deploymentId;
    } catch (error: any) {
        console.error('Error deploying bot:', error.response?.data || error.message);
        throw error;
    }
};

export const getDeployStatus = async (deploymentId: string, token: string, userEmail: string): Promise<DeployStatusItem> => {
    const parametrosDeployStatus: DeployStatusParams = {
        filter: {
            operator: "eq",
            field: "deploymentId",
            value: deploymentId,
        },
    };

    try {
        const { data: deployStatusData }: AxiosResponse<DeployStatusData> = await axios.post(
            "v3/activity/list",
            parametrosDeployStatus,
            {
                headers: { "X-Authorization": token },
                _userEmail: userEmail,
            }
        );

        if (!deployStatusData.list || deployStatusData.list.length === 0) {
            throw new Error("Deployment information not found");
        }

        return deployStatusData.list[0];
    } catch (error: any) {
        console.error('Error getting deploy status:', error.response?.data || error.message);
        throw error;
    }
};

interface Filter {
    operator: "NOT" | "le" | "eq" | "ne" | "ge" | "gt" | "substring" | "and" | "or" | "not";
    operands?: Filter[];
    field?: string;
    value?: string;
}

interface SortDirection {
    field: string;
    direction: "asc" | "desc";
}

interface PageRequest {
    offset: number;
    length: number;
}

interface BotsListParams {
    filter: Filter;
    sort: SortDirection[];
    page?: PageRequest;
}

interface BotFromAPI {
    id: string;
    parent: string;
    name: string;
    permission: object;
    lastModified: string;
    lastModifiedBy: string;
    path: string;
    directory: string;
    size: number;
    locked: string;
    productionVersion: string;
    lockedBy: string;
    latestVersion: string;
    fileLastModified: string;
    type: string;
}

interface BotsListData {
    page: object;
    list: BotFromAPI[];
}

export const getFolderContents = async (token: string, folderId: string, userEmail: string): Promise<BotFromAPI[]> => {
    configureBaseURL(userEmail);
    const params: BotsListParams = {
        filter: {
            operator: "eq",
            field: "parentId",
            value: folderId
        },
        sort: [
            {
                field: "name",
                direction: "asc"
            }
        ]
    };

    try {
        const { data: folderData }: AxiosResponse<BotsListData> = await axios.post(
            "v2/repository/workspaces/private/files/list",
            params,
            {
                headers: { "X-Authorization": token },
                _userEmail: userEmail,
            }
        );

        return folderData.list || [];
    } catch (error: any) {
        console.error('Error getting folder contents:', error.response?.data || error.message);
        throw error;
    }
};

export const getBotsList = async (token: string, userEmail: string): Promise<BotFromAPI[]> => {
    configureBaseURL(userEmail);
    const dirParams: BotsListParams = {
        filter: {
            operator: "eq",
            field: "name",
            value: "Bots"
        },
        sort: [
            {
                field: "name",
                direction: "asc"
            }
        ]
    };

    const authOpts = {
        headers: { "X-Authorization": token },
        _userEmail: userEmail,
    };

    try {
        const { data: dirData }: AxiosResponse<BotsListData> = await axios.post(
            "v2/repository/workspaces/private/files/list",
            dirParams,
            authOpts
        );

        if (!dirData.list || dirData.list.length === 0) {
            throw new Error("Bots directory not found");
        }

        const botsDirectoryId = dirData.list[0].id;
        const botsParams: BotsListParams = {
            filter: {
                operator: "eq",
                field: "parentId",
                value: botsDirectoryId
            },
            sort: [
                {
                    field: "name",
                    direction: "asc"
                }
            ]
        };

        const { data: botsData }: AxiosResponse<BotsListData> = await axios.post(
            "v2/repository/workspaces/private/files/list",
            botsParams,
            authOpts
        );

        if (!botsData.list || botsData.list.length === 0) {
            throw new Error("No bots found in directory");
        }

        // Return both bots and folders
        return botsData.list;
    } catch (error: any) {
        console.error('Error getting bots list:', error.response?.data || error.message);
        throw error;
    }
};

interface ResetDeviceParams {
    deviceIds: {
        ids: string[];
    };
}

export const resetDevice = async (deviceId: string, token: string, userEmail: string): Promise<void> => {
    const resetParams: ResetDeviceParams = {
        deviceIds: {
            ids: [deviceId]
        }
    };

    try {
        await axios.post(
            "v2/devices/reset",
            resetParams,
            {
                headers: { "X-Authorization": token },
                _userEmail: userEmail,
            }
        );
    } catch (error: any) {
        console.error('Error resetting device:', error.response?.data || error.message);
        throw error;
    }
};

// Control Room list filters: leaf comparisons combined with and/or over "operands".
type ActivityFilter =
    | { operator: "eq" | "gt" | "ge" | "lt" | "le"; field: string; value: string }
    | { operator: "and" | "or"; operands: ActivityFilter[] };

interface ActivitySort {
    field: "startDateTime";
    direction: "desc";
}

interface ActivityPage {
    offset: number;
    length: number;
}

interface ActivityParams {
    filter: ActivityFilter;
    sort: ActivitySort[];
    page: ActivityPage;
}

interface ActivityItem {
    id: string;
    automationName: string;
    fileName: string;
    filePath: string;
    type: string;
    startDateTime: string;
    endDateTime: string;
    command: string;
    status: string;
    progress: number;
    automationId: string;
    userId: string;
    deviceId: string;
    currentLine: number;
    totalLines: number;
    fileId: string;
    modifiedBy: string;
    createdBy: string;
    modifiedOn: string;
    createdOn: string;
    deploymentId: string;
    queueName: string;
    queueId: string;
    usingRdp: boolean;
    message: string;
    canManage: boolean;
    deviceName: string;
    userName: string;
    tenantUuid: string;
    automationPriority: string;
    callbackInfo: string;
    runElevated: boolean;
    botLabel: string;
    currentBotName: string;
    rolesWithAccess: string[];
    workspaceType: string;
    systemBot: boolean;
    initiationType: string;
    activityType: string;
}

interface ActivityData {
    page: {
        offset: number;
        total: number;
        totalFilter: number;
    };
    list: ActivityItem[];
}

export const getRunningActivities = async (username: string, token: string): Promise<ActivityItem[]> => {
    configureBaseURL(username);

    const params: ActivityParams = {
        filter: {
            operator: "eq",
            field: "status",
            value: "UPDATE"
        },
        sort: [
            {
                field: "startDateTime",
                direction: "desc"
            }
        ],
        page: {
            offset: 0,
            length: 1
        }
    };

    try {
        const { data: activityData }: AxiosResponse<ActivityData> = await axios.post(
            "v3/activity/list",
            params,
            {
                headers: { "X-Authorization": token },
                _userEmail: username,
            }
        );

        return activityData.list || [];
    } catch (error: any) {
        console.error('Error getting running activities:', error.response?.data || error.message);
        throw error;
    }
};

interface HistoryParams {
    filter?: ActivityFilter;
    sort: ActivitySort[];
    page: {
        offset: number;
        length: number;
    };
}

/** Server-side filters for Activity > Historical. */
export interface HistoryFilter {
    /** Any of these statuses (e.g. RUN_FAILED); empty or undefined = all. */
    statuses?: string[];
    /** Only runs that started at or after this ISO date-time. */
    since?: string;
}

const buildHistoryFilter = (filter?: HistoryFilter): ActivityFilter | undefined => {
    const parts: ActivityFilter[] = [];
    if (filter?.statuses?.length) {
        const byStatus: ActivityFilter[] = filter.statuses.map(value => ({ operator: "eq", field: "status", value }));
        parts.push(byStatus.length === 1 ? byStatus[0] : { operator: "or", operands: byStatus });
    }
    if (filter?.since) {
        parts.push({ operator: "ge", field: "startDateTime", value: filter.since });
    }
    if (parts.length === 0) return undefined;
    return parts.length === 1 ? parts[0] : { operator: "and", operands: parts };
};

interface HistoryData {
    page: {
        offset: number;
        total: number;
        totalFilter: number;
    };
    list: ActivityItem[];
}

export const getExecutionHistory = async (
    username: string,
    token: string,
    offset: number = 0,
    length: number = 20,
    filter?: HistoryFilter
): Promise<HistoryData> => {
    configureBaseURL(username);

    const params: HistoryParams = {
        filter: buildHistoryFilter(filter),
        sort: [
            {
                field: "startDateTime",
                direction: "desc"
            }
        ],
        page: {
            offset,
            length
        }
    };

    try {
        const { data: historyData }: AxiosResponse<HistoryData> = await axios.post(
            "v3/activity/list",
            params,
            {
                headers: { "X-Authorization": token },
                _userEmail: username,
            }
        );

        return historyData;
    } catch (error: any) {
        console.error('Error getting execution history:', error.response?.data || error.message);
        throw error;
    }
};

export const getBotContent = async (fileId: string, token: string, username: string): Promise<BotContentResponse> => {
    configureBaseURL(username);
    try {
        const response: AxiosResponse<BotContentResponse> = await axios.get(
            `v2/repository/files/${fileId}/content`,
            {
                headers: {
                    'X-Authorization': token,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
                _userEmail: username,
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('Error getting bot content:', error.response?.data || error.message);
        throw error;
    }
};