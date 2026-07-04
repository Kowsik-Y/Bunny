export const IOS_UA =
  'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)';

export const ANDROID_UA =
  'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip';

export const CLIENTS = [
  {
    name: 'ANDROID_VR',
    context: {
      client: {
        clientName: 'ANDROID_VR', clientVersion: '1.43.32',
        osName: 'Android', osVersion: '12',
        deviceMake: 'Oculus', deviceModel: 'Quest 3',
        androidSdkVersion: 32,
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/107.0.5284.2)',
      'X-YouTube-Client-Name': '28',
      'X-YouTube-Client-Version': '1.43.32',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/107.0.5284.2)',
    useSignatureTimestamp: false,
  },
  {
    name: 'ANDROID_VR_1_61_48',
    context: {
      client: {
        clientName: 'ANDROID_VR', clientVersion: '1.61.48',
        osName: 'Android', osVersion: '12',
        deviceMake: 'Oculus', deviceModel: 'Quest 3',
        androidSdkVersion: 32,
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/132.0.6808.3)',
      'X-YouTube-Client-Name': '28',
      'X-YouTube-Client-Version': '1.61.48',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/132.0.6808.3)',
    useSignatureTimestamp: false,
  },
  {
    name: 'TV_EMBEDDED',
    context: { client: {
      clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0',
      hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
    }},
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (PlayStation; PlayStation 4/12.02) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
      'X-YouTube-Client-Name': '85',
      'X-YouTube-Client-Version': '2.0',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'Mozilla/5.0 (PlayStation; PlayStation 4/12.02) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
    useSignatureTimestamp: true,
  },
  {
    name: 'ANDROID_CREATOR',
    context: { client: {
      clientName: 'ANDROID_CREATOR', clientVersion: '25.03.101',
      osName: 'Android', osVersion: '15',
      deviceMake: 'Google', deviceModel: 'Pixel 9 Pro Fold',
      androidSdkVersion: 35,
      hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
    }},
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.apps.youtube.creator/25.03.101 (Linux; U; Android 15; en_US; Pixel 9 Pro Fold; Build/AP3A.241005.015.A2; Cronet/132.0.6779.0)',
      'X-YouTube-Client-Name': '14',
      'X-YouTube-Client-Version': '25.03.101',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.android.apps.youtube.creator/25.03.101 (Linux; U; Android 15; en_US; Pixel 9 Pro Fold; Build/AP3A.241005.015.A2; Cronet/132.0.6779.0)',
    useSignatureTimestamp: true,
  },
  {
    name: 'VISIONOS',
    context: { client: {
      clientName: 'VISIONOS', clientVersion: '0.1',
      osName: 'visionOS', osVersion: '1.3.21O771',
      deviceMake: 'Apple', deviceModel: 'RealityDevice14,1',
      hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
    }},
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      'X-YouTube-Client-Name': '101',
      'X-YouTube-Client-Version': '0.1',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    useSignatureTimestamp: false,
  },
  {
    name: 'ANDROID_NO_PARAMS',
    context: {
      client: {
        clientName: 'ANDROID', clientVersion: '21.03.38',
        androidSdkVersion: 34,
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip',
      'X-YouTube-Client-Name': '3',
      'X-YouTube-Client-Version': '21.03.38',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip',
    useSignatureTimestamp: false,
  },
  {
    name: 'WEB',
    context: {
      client: {
        clientName: 'WEB', clientVersion: '2.20260213.00.00',
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
      'X-YouTube-Client-Name': '1',
      'X-YouTube-Client-Version': '2.20260213.00.00',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    useSignatureTimestamp: false,
  },
  {
    name: 'IOS',
    context: {
      client: {
        clientName: 'IOS', clientVersion: '21.03.1',
        deviceModel: 'iPhone16,2',
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)',
      'X-YouTube-Client-Name': '5',
      'X-YouTube-Client-Version': '21.03.1',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)',
    useSignatureTimestamp: false,
  },
  {
    name: 'ANDROID_AGE_RESTRICTED',
    context: {
      client: {
        clientName: 'ANDROID', clientVersion: '21.03.38',
        androidSdkVersion: 34,
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip',
      'X-YouTube-Client-Name': '3',
      'X-YouTube-Client-Version': '21.03.38',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { params: 'CgIQBg', contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip',
    useSignatureTimestamp: false,
  },
];
