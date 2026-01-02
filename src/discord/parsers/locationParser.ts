import { getDiscordStateFromStore, setDiscordStateInStore, setLocationStatus, setLocationStatusWithMatch } from "../../discord";
import { Store } from "../../store";
import { SWF_GAMES_PATH, SWF_IGLOO_ROOM_PATH, SWF_MIME_FILE, SWF_QUESTS_GAMES_PATH, SWF_ROOMS_PATH } from "../constants";

const isNumeric = (value: string) => {
    return ((value != null) &&
        (value !== '') &&
        !isNaN(Number(value.toString())));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseAndUpdateLocation = async (store: Store, params: any) => {
    const url = params.response.url as string;

    // Bad path
    if (!url.includes(SWF_ROOMS_PATH) && !url.includes(SWF_GAMES_PATH) && !url.includes(SWF_QUESTS_GAMES_PATH) && !url.includes(SWF_IGLOO_ROOM_PATH)) {
        return;
    }

    const swfMimeIndex = url.indexOf(SWF_MIME_FILE);
    const lastBarIndex = url.lastIndexOf('/');

    const fileName = url.substring(lastBarIndex + 1, swfMimeIndex);

    // If file name is numeric we won't update the location because games like Card-Jitsu
    // can share the same SWF as other games.
    if (isNumeric(fileName)) {
        return;
    }

    let match: string;

    if (url.includes(SWF_QUESTS_GAMES_PATH)) { // PSA missions
        const swfPathIndex = url.lastIndexOf(SWF_QUESTS_GAMES_PATH) + SWF_QUESTS_GAMES_PATH.length;

        match = url.substring(swfPathIndex, url.indexOf(fileName + SWF_MIME_FILE) - 1);

        // if the match contains any '/' it is a subpath resource, just ignore it.
        if (match.includes('/')) {
            return;
        }
    } else if (url.includes(SWF_IGLOO_ROOM_PATH)) { // In an igloo
        match = 'igloo';
    }
    else {
        const swfPathType = url.includes(SWF_ROOMS_PATH)
            ? SWF_ROOMS_PATH
            : SWF_GAMES_PATH;

        const swfPathIndex = url.lastIndexOf(swfPathType) + swfPathType.length;

        match = swfPathType === SWF_GAMES_PATH // Any other minigames
            ? url.substring(swfPathIndex, url.indexOf(fileName + SWF_MIME_FILE) - 1)
            : url.substring(swfPathIndex, swfMimeIndex);

        // if the match contains any '/' it is a subpath resource, just ignore it.
        if (match.includes('/')) {
            return;
        }
    }

    const state = getDiscordStateFromStore(store);

    // Edge case for differentiating The Mine room from Cart Surfer.
    if (match === 'mine' && url.includes(SWF_GAMES_PATH)) {
        match = 'Cart Surfer';
    }

    // The location hasn't changed.
    if (state.currentLocation && state.currentLocation.match === match.toLowerCase()) {
        return;
    }

    const location = state.trackedLocations.filter(location => {
        return location.match === match.toLowerCase();
    })[0];

    state.currentLocation = location;

    if (!location) {
        await setLocationStatusWithMatch(store, state, match);
    } else {
        await setLocationStatus(store, state, location);
    }

    setDiscordStateInStore(store, state);
};
