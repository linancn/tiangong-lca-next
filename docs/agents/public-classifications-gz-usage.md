# `public/classifications` `.gz` Data Usage Guide

Chinese mirror: `docs/public-classifications-gz-usage_CN.md`

## Quick Summary

There are 8 `.gz` files under `public/classifications`. In the app, they are used at two layers:

1. Pre-cache layer  
   After the app shell loads, `ClassificationCacheMonitor` adds all 8 files to the pre-cache workflow. After a 3-second delay, it fetches them in batches of 2, decompresses them, and stores them in IndexedDB. See `src/app.tsx:104-107`, `src/components/ClassificationCacheMonitor/index.tsx:10-42`, and `src/components/CacheMonitor/useResourceCacheMonitor.ts:44-126`.

2. Business-read layer  
   Pages and services do not read the `.gz` files directly. They first try to read from IndexedDB through `src/services/classifications/util.ts`. If the file is not cached yet, the code fetches `'/classifications/<filename>'`, decompresses it, and writes it back to the cache. See `src/services/classifications/util.ts:117-164`.

So in practice:

- After startup, the app tries to warm all 8 files into cache.
- Which file is actually used by business logic is decided by `src/services/classifications/api.ts`, based on `categoryType`, `lang`, and whether a `Flow` is an `Elementary flow`.

## Overall Mapping

| File | When it is used | Data it actually carries |
| --- | --- | --- |
| `CPCClassification.min.json.gz` | When calling `getILCDClassification('Flow', 'en', ...)` | English tree for normal `Flow` classification |
| `CPCClassification_zh.min.json.gz` | When calling `getILCDClassification('Flow', 'zh', ...)` | Chinese label tree for normal `Flow` classification |
| `ISICClassification.min.json.gz` | When calling `getILCDClassification('Process'/'LifeCycleModel', 'en', ...)` | English tree for `Process` / `LifeCycleModel` classification |
| `ISICClassification_zh.min.json.gz` | When calling `getILCDClassification('Process'/'LifeCycleModel', 'zh', ...)` | Chinese label tree for `Process` / `LifeCycleModel` classification |
| `ILCDClassification.min.json.gz` | When requesting English classifications for `Contact`, `Source`, `UnitGroup`, or `FlowProperty` | Shared ILCD English classification tree grouped by `@dataType` |
| `ILCDClassification_zh.min.json.gz` | When requesting Chinese classifications for the objects above | Shared ILCD Chinese classification tree grouped by `@dataType` |
| `ILCDFlowCategorization.min.json.gz` | When `Flow` and `flowType === 'Elementary flow'` | English tree for elementary flow categorization |
| `ILCDFlowCategorization_zh.min.json.gz` | When `Flow`, `flowType === 'Elementary flow'`, and Chinese is requested | Chinese label tree for elementary flow categorization |

The core selection logic is all in `src/services/classifications/api.ts`:

- file constants: `29-47`
- special source selection for `Flow`, `Process`, and `LifeCycleModel`: `177-196`
- general classification loading: `205-254`
- elementary flow categorization loading: `256-285`
- combined flow classification plus elementary-flow categorization loading: `287-298`

## Detailed Usage by File Group

### 1. `CPCClassification*.gz`

This file group is used only when `categoryType === 'Flow'`.  
In `src/services/classifications/api.ts:177-185`, `Flow` is mapped to `CPCClassification*.gz` instead of `ILCDClassification*.gz`.

#### When it is used

- In the Flow form classification selector, when `flowType` is not `Elementary flow`  
  `src/components/LevelTextItem/form.tsx:137-148`
- In the Flow detail classification path display, when `flowType` is not `Elementary flow`  
  `src/components/LevelTextItem/description.tsx:21-29`
- On the Flows list page when loading classification filter options, where normal Flow classifications are placed into `category`  
  `src/services/classifications/cache.ts:56-85`  
  `src/pages/Flows/index.tsx:346-366`
- When Flow list/detail data is converted into Chinese classification text, normal Flow rows read from the `category` branch  
  `src/services/flows/api.ts:325-348`  
  `src/services/general/api.ts:1187-1205`

#### Result

- English UI uses only the English file.
- Chinese UI first uses the English tree as the structural base, then overlays labels from the Chinese file by matching the same `@id`. See `src/services/classifications/api.ts:211-240`.

### 2. `ILCDFlowCategorization*.gz`

This file group is only for `Elementary flow`. It is not used for normal `Flow`.

#### When it is used

- In the Flow form, when `dataType === 'Flow'` and `flowType === 'Elementary flow'`  
  `src/components/LevelTextItem/form.tsx:140-145`
- In the Flow detail view, when `categoryType === 'Flow'` and `flowType === 'Elementary flow'`  
  `src/components/LevelTextItem/description.tsx:21-24`
- On the Flows list page when building classification filters, where elementary-flow items are stored in `categoryElementaryFlow` and exposed as filter values like `elementary:<id>`  
  `src/services/classifications/api.ts:287-295`  
  `src/pages/Flows/index.tsx:350-366`
- When Flow list/detail data is converted into Chinese classification text, rows with `typeOfDataSet === 'Elementary flow'` use the `categoryElementaryFlow` branch  
  `src/services/flows/api.ts:333-348`  
  `src/services/general/api.ts:1192-1205`

#### Result

- Normal Flow never hits this file group.
- Only elementary flow hits it.

### 3. `ISICClassification*.gz`

This file group is selected by `getSpecialClassificationSource()` and shared by `Process` and `LifeCycleModel`.  
See `src/services/classifications/api.ts:188-193`.

#### When it is used

- For Process list, search results, details, and other Chinese classification mapping paths  
  `src/services/processes/api.ts:65-80`  
  `src/services/processes/api.ts:503-520`  
  `src/services/processes/api.ts:758-780`  
  `src/services/processes/api.ts:1148-1169`  
  `src/services/general/api.ts:1292-1312`
- For Life cycle model list/detail classification mapping  
  `src/services/lifeCycleModels/api.ts:477`  
  `src/services/lifeCycleModels/api.ts:591`  
  `src/services/lifeCycleModels/api.ts:706`  
  `src/services/general/api.ts:1362-1366`
- In the shared classification form/detail components when the incoming `categoryType` is `Process` or `LifeCycleModel`  
  `src/components/LevelTextItem/form.tsx:146`  
  `src/components/LevelTextItem/description.tsx:27`

#### Result

- `Process` and `LifeCycleModel` do not read `ILCDClassification*.gz`; they read `ISICClassification*.gz` directly.
- In code, `LifeCycleModel` reuses the `dataType: 'Process'` tree. See `src/services/classifications/api.ts:188-192`.

### 4. `ILCDClassification*.gz`

This is the shared ILCD classification file set. It is read by `@dataType` group.  
See `src/services/classifications/api.ts:159-175` and `198-203`.

The main currently used object types are:

- `Contact`
- `Source`
- `UnitGroup`
- `FlowProperty`

#### When it is used

- Contact list/detail classification display  
  `src/services/contacts/api.ts:197`  
  `src/services/contacts/api.ts:287`  
  `src/services/contacts/api.ts:365`  
  `src/services/general/api.ts:982-993`
- Source list/detail classification display  
  `src/services/sources/api.ts:195`  
  `src/services/sources/api.ts:308`  
  `src/services/sources/api.ts:416`  
  `src/services/general/api.ts:1010-1015`
- UnitGroup list/detail classification display  
  `src/services/unitgroups/api.ts:198`  
  `src/services/unitgroups/api.ts:322`  
  `src/services/unitgroups/api.ts:445`  
  `src/services/general/api.ts:1062-1077`
- FlowProperty list/detail classification display  
  `src/services/flowproperties/api.ts:200`  
  `src/services/flowproperties/api.ts:316`  
  `src/services/flowproperties/api.ts:451`  
  `src/services/general/api.ts:1125-1129`
- In the shared classification selector/detail components whenever one of the category types above is passed in  
  `src/components/LevelTextItem/form.tsx:146`  
  `src/components/LevelTextItem/description.tsx:27`

#### Result

- English reads only `ILCDClassification.min.json.gz`.
- Chinese also reads `ILCDClassification_zh.min.json.gz`, and uses `categoryTypeOptions` to map the English type name to the Chinese type name before looking up the matching group. See `src/services/classifications/api.ts:221-238`.

## When the code loads the full tree vs. a partial path

There are two common call patterns in the code.

### 1. `['all']`

This means load the full classification tree. It is commonly used for:

- form dropdown / cascader options
- list-page classification display
- Flow-page classification filter initialization
- Chinese label mapping cache

Typical places:

- `src/components/LevelTextItem/form.tsx:143-146`
- `src/services/classifications/cache.ts:73-80`
- `src/pages/Flows/index.tsx:350`

### 2. `[some id]`

This means load only the matching classification path for that id. It is commonly used to display one already-selected classification path in a detail view.  
Typical place:

- `src/components/LevelTextItem/description.tsx:21-29`

The underlying filter logic is here:

- general classification: `src/services/classifications/api.ts:108-145`
- elementary-flow categorization: `src/services/classifications/api.ts:73-106`

## Cache and Read Order

The full flow is:

1. The app shell mounts `ClassificationCacheMonitor`.  
   `src/app.tsx:104-107`
2. After 3 seconds, pre-caching starts. If the manifest version matches, the file list matches, the cache is less than 24 hours old, and all 8 files already exist in IndexedDB, the app skips re-fetching.  
   `src/components/CacheMonitor/useResourceCacheMonitor.ts:44-77`
3. If the cache needs rebuilding, the app calls `cacheAndDecompressClassificationFile()` in batches, fetches `/classifications/<filename>`, decompresses the `.gz`, and stores the parsed JSON in IndexedDB.  
   `src/components/CacheMonitor/useResourceCacheMonitor.ts:80-118`  
   `src/services/classifications/util.ts:128-143`
4. When business code later calls `getILCDClassification()` or `getILCDFlowCategorization()`, it first reads from IndexedDB; if the file is still missing, it fetches it on demand.  
   `src/services/classifications/util.ts:150-163`
5. There is also an in-memory cache above that layer to avoid repeatedly rebuilding the same classification tree during the same session.  
   `src/services/classifications/cache.ts:29-53`  
   `src/services/classifications/cache.ts:56-85`

## One notable point in the current code

`categoryTypeOptions` includes `LCIAMethod`; see `src/services/classifications/util.ts:25-53`.  
But the current code search does not show any real `getILCDClassification('LCIAMethod', ...)` call.

That means:

- `ILCDClassification*.gz` can theoretically carry `LCIAMethod` classification data.
- But in the current codebase, the `.gz` files under `public/classifications` are not yet actively consumed by an LCIA method classification UI path.

## One-line Summary

- Normal `Flow` uses `CPCClassification*.gz`
- `Elementary flow` uses `ILCDFlowCategorization*.gz`
- `Process` and `LifeCycleModel` use `ISICClassification*.gz`
- `Contact`, `Source`, `UnitGroup`, and `FlowProperty` use `ILCDClassification*.gz`
- Chinese display additionally reads the matching `_zh` file to overlay labels
- The app tries to pre-cache all 8 `.gz` files at startup, but the actual file hit at runtime depends on object type, language, and `Flow` `flowType`
