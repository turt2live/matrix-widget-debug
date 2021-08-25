function parseFragment() {
    const fragmentString = (window.location.hash || "?");
    const search = new URLSearchParams(fragmentString.substring(Math.max(fragmentString.indexOf('?'), 0)));
    const object = {};
    for (const key of search.keys()) {
        object[key] = search.get(key);
    }
    return object;
}

function setCompleteEmoji(actionId) {
    $(`#${actionId}`).text('✅');
}

function registerEmojiAction(action) {
    widgetApi.on(`action:${action}`, () => {
        setCompleteEmoji(`action-${action}`);
    });
}

const params = parseFragment();
$("#parsed-fragment").text(JSON.stringify(params, null, 4));

const requestCapabilities = JSON.parse(localStorage.getItem("mxw_caps_to_request") || "[]");
requestCapabilities.push(mxwidgets.MatrixCapabilities.Screenshots);
requestCapabilities.push(...JSON.parse(localStorage.getItem("mxw_timeline_caps") || "[]"));

updateTimelineCaps();

$("input.cap-cb").each((_, c) => {
    const cb = $(c);
    if (requestCapabilities.includes(cb.data('cap'))) {
        cb.attr('checked', true);
    }
});

const widgetApi = new mxwidgets.WidgetApi(params['widgetId']);
widgetApi.requestCapabilities(requestCapabilities);
widgetApi.on("ready", () => {
    setCompleteEmoji("action-ready");
});
registerEmojiAction(mxwidgets.WidgetApiToWidgetAction.Capabilities);
registerEmojiAction(mxwidgets.WidgetApiToWidgetAction.SupportedApiVersions);
registerEmojiAction(mxwidgets.WidgetApiToWidgetAction.WidgetConfig);
registerEmojiAction(mxwidgets.WidgetApiToWidgetAction.NotifyCapabilities);

$("#requested-capabilities").text(requestCapabilities.join('\n') || "<none>");
widgetApi.on(`action:${mxwidgets.WidgetApiToWidgetAction.NotifyCapabilities}`, (ev) => {
    $("#granted-capabilities").text(ev.detail.data.approved.join('\n') || "<none>");
    $("#claimed-capabilities").text(ev.detail.data.requested.join('\n') || "<none>");
});

widgetApi.on(`action:${mxwidgets.WidgetApiToWidgetAction.TakeScreenshot}`, (ev) => {
    ev.preventDefault();
    fetch("screenshots-working.png").then(r => r.blob()).then(b => {
        widgetApi.transport.reply(ev.detail, {
            screenshot: b,
        });
    });
});

widgetApi.on(`action:${mxwidgets.WidgetApiToWidgetAction.UpdateVisibility}`, (ev) => {
    console.log("[DbgWidget] On screen? ", ev.detail.data.visibility);
    $("on-screen").text(ev.detail.data.visibility);
});

widgetApi.on(`action:${mxwidgets.WidgetApiToWidgetAction.SendEvent}`, (ev) => {
    console.log("[DbgWidget] Received timeline event: ", ev.detail.data);

    $("#receive-events-log").text($("#receive-events-log").text() + "\n" + JSON.stringify(ev.detail.data, null, 2));

    // ack
    ev.preventDefault();
    widgetApi.transport.reply(ev.detail, {});
});

widgetApi.on("ready", () => {
    // XXX: Private method access
    widgetApi.getClientVersions().then(versions => {
        $("#api-versions").text(JSON.stringify(versions));
    });
});

widgetApi.start();

function requestOIDC() {
    widgetApi.requestOpenIDConnectToken().then(token => {
        $("#oidc-result").text(JSON.stringify(token, null, 4));
    }).catch(error => {
        $("#oidc-result").text("ERROR: " + error.message);
    });
}

function sendContentLoaded() {
    widgetApi.sendContentLoaded();
}

function sendLegacySticker() {
    widgetApi.sendSticker({
        name: "Example Sticker",
        description: "This is a longform description of the sticker",
        content: {
            url: "mxc://t2l.io/b03bb226fec71d4129e767d6b551701a9506ba67",
            info: {
                w: 256,
                h: 256,
                mimetype: "image/png"
            },
        },
    });
}

function setSticky(sticky) {
    widgetApi.setAlwaysOnScreen(sticky);
}

function updateCapabilities() {
    const caps = [];
    $("input.cap-cb").each((_, c) => {
        const cb = $(c);
        if (!cb.is(':checked')) return;
        caps.push(cb.data('cap'));
    });
    localStorage.setItem("mxw_caps_to_request", JSON.stringify(caps));
}

function navigateLink() {
    widgetApi.navigateTo($("#navigate-permalink").val());
}

function changeRoom() {
    widgetApi.transport.send("io.element.view_room", {room_id: $("#element-room-id").val()});
}

function renegotiateCapabilities() {
    const requestCapabilities = JSON.parse(localStorage.getItem("mxw_caps_to_request") || "[]");
    requestCapabilities.push(mxwidgets.MatrixCapabilities.Screenshots);
    widgetApi.requestCapabilities(requestCapabilities);
    widgetApi.updateRequestedCapabilities();
}

function readMessages(roomId) {
    if (roomId === "#") roomId = $("#send-receive-room-id").val();
    if (roomId) roomId = [roomId];
    widgetApi.readRoomEvents("m.room.message", 1000, undefined, roomId).then(events => {
        $("#read-events-result").text(`${events.length} results\n` + JSON.stringify(events, null, 2));
    });
}

function readTextMessages(roomId) {
    if (roomId === "#") roomId = $("#send-receive-room-id").val();
    if (roomId) roomId = [roomId];
    widgetApi.readRoomEvents("m.room.message", 1000, "m.text", roomId).then(events => {
        $("#read-events-result").text(`${events.length} results\n` + JSON.stringify(events, null, 2));
    });
}

function readMembers(roomId) {
    if (roomId === "#") roomId = $("#send-receive-room-id").val();
    if (roomId) roomId = [roomId];
    widgetApi.readStateEvents("m.room.member", 1000, undefined, roomId).then(events => {
        $("#read-events-result").text(`${events.length} results\n` + JSON.stringify(events, null, 2));
    });
}

function readAlice(roomId) {
    if (roomId === "#") roomId = $("#send-receive-room-id").val();
    if (roomId) roomId = [roomId];
    widgetApi.readStateEvents("m.room.member", 1000, "@alice:localhost", roomId).then(events => {
        $("#read-events-result").text(`${events.length} results\n` + JSON.stringify(events, null, 2));
    });
}

function sendMessage(msgtype, roomId) {
    if (roomId === "#") roomId = $("#send-receive-room-id").val();
    widgetApi.sendRoomEvent('m.room.message', {
        msgtype: msgtype,
        body: 'This is from a widget!',
    }, roomId);
}

function sendKick(victimId, roomId) {
    if (roomId === "#") roomId = $("#send-receive-room-id").val();
    widgetApi.sendStateEvent('m.room.member', victimId, {
        membership: "leave",
        reason: "sent by widget",
    }, roomId);
}

function addTimelineCap() {
    const currentCaps = JSON.parse(localStorage.getItem("mxw_timeline_caps") || "[]");
    currentCaps.push(`org.matrix.msc2762.timeline:${$("#timeline-room-id").val()}`);
    localStorage.setItem("mxw_timeline_caps", JSON.stringify(currentCaps));
    updateTimelineCaps();
    $("#timeline-room-id").val("");
}

function updateTimelineCaps() {
    const currentCaps = JSON.parse(localStorage.getItem("mxw_timeline_caps") || "[]");
    let html = "";
    for (const cap of currentCaps) {
        html += `
            <label>
                <input type="checkbox" class="cap-cb" data-cap="${cap}" onchange="updateCapabilities()" checked="checked" disabled="disabled">
                [Timeline] <code>${cap.substring(cap.indexOf(':') + 1)}</code>
            </label>
        `;
    }
    $("#timeline-room-caps").html(html);
}