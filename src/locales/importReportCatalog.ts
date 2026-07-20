import type { SupportedAppLocale } from '@/services/general/localeRegistry';

export type ImportReportLocaleContent = Readonly<{
  humanSummaryTemplate: string;
  readmeMarkdown: string;
}>;

export const IMPORT_REPORT_CONTENT_BY_APP_LOCALE = {
  'zh-CN': {
    humanSummaryTemplate: '导入结果：{code}。总记录 {total_entries} 条，开放数据跳过 {filtered_open_data_count} 条，用户数据冲突 {user_conflict_count} 条，成功导入 {imported_count} 条，校验问题 {validation_issue_count} 条。',
    readmeMarkdown: `# 如何查看这个导入报告

这个文件中的 \`report\` 是系统导入接口最终返回的完整结果，里面既可能有“用户数据冲突”，也可能有“数据校验失败”的详细信息。

## 先看什么

1. 先看 \`report.code\`：
   - \`VALIDATION_FAILED\`：数据包内容本身有问题，系统已阻止导入。
   - 其他失败码且 \`user_conflicts\` 不为空：目标环境里已有冲突的用户数据。
2. 再看 \`report.summary\`：
   - \`total_entries\`：数据包里一共有多少条记录。
   - \`filtered_open_data_count\`：被跳过的开放数据数量。
   - \`user_conflict_count\`：与当前用户数据冲突的记录数量。
   - \`validation_issue_count\`：校验问题数量。

## 如果是校验失败，去哪里找问题

看 \`report.validation_issues\` 数组。每一条问题里最重要的是：

- \`file_path\`：问题出在哪个文件。
- \`location\`：问题在文件里的哪个字段路径。
- \`message\`：系统直接告诉你的错误说明。
- \`issue_code\`：问题类型。
- \`severity\`：严重级别，通常 \`error\` 需要先修复，\`warning\` 建议检查。
- \`context\`：补充上下文，给开发或高级用户排查用。

如果你看不懂 \`location\`，最简单的方法是：

1. 先解压原始 ZIP 数据包。
2. 打开 \`file_path\` 对应的文件。
3. 在文件里按 \`location\` 提示逐层查找字段。
4. 对照 \`message\` 修改数据后重新打包导入。

## 如果是用户数据冲突，去哪里找问题

看 \`report.user_conflicts\` 数组。每一条冲突记录里最重要的是：

- \`table\`：冲突的数据表类型。
- \`id\`：冲突记录的主 ID。
- \`version\`：冲突记录的版本。
- \`state_code\`：当前系统里这条记录的状态。
- \`user_id\`：如果有值，表示这条冲突数据关联到哪个用户。

常见处理方法：

1. 先确认目标系统中是否已经有同一条用户数据。
2. 如果已有数据且应该保留，修改导入包中的 \`id\` / \`version\` 或删除重复记录。
3. 如果目标系统中的旧数据不再需要，先在系统中处理旧数据，再重新导入。

## 被跳过的开放数据是什么意思

\`report.filtered_open_data\` 里的记录表示：这些数据属于开放数据，导入时被系统自动跳过，没有写入你的用户数据空间。

这通常不是错误，除非你本来就预期它们应该作为用户数据导入。
`,
  },
  'en-US': {
    humanSummaryTemplate: 'Import result: {code}. Total records: {total_entries}, skipped open-data records: {filtered_open_data_count}, user conflicts: {user_conflict_count}, imported: {imported_count}, validation issues: {validation_issue_count}.',
    readmeMarkdown: `# How to read this import report

The \`report\` object in this file is the final result returned by the import API. It may contain detailed validation failures, user-data conflicts, or skipped open-data records.

## What to check first

1. Start with \`report.code\`:
   - \`VALIDATION_FAILED\`: the package content itself is invalid, so the import was blocked.
   - Other failure codes with non-empty \`user_conflicts\`: the target environment already has conflicting user-owned data.
2. Then review \`report.summary\`:
   - \`total_entries\`: total records found in the package.
   - \`filtered_open_data_count\`: open-data records skipped during import.
   - \`user_conflict_count\`: records conflicting with existing user data.
   - \`validation_issue_count\`: total validation issues found.

## If validation failed, where is the problem

Check the \`report.validation_issues\` array. The most important fields are:

- \`file_path\`: which file contains the problem.
- \`location\`: which field path inside that file is problematic.
- \`message\`: the direct explanation from the validator.
- \`issue_code\`: the issue type.
- \`severity\`: the severity level. Usually \`error\` must be fixed first, while \`warning\` should still be reviewed.
- \`context\`: extra debugging context for developers or advanced users.

If \`location\` is hard to read, use this simple workflow:

1. Extract the original ZIP package.
2. Open the file shown in \`file_path\`.
3. Follow the field path from \`location\`.
4. Fix the data according to \`message\`, then rebuild and re-import the package.

## If there are user-data conflicts, where is the problem

Check the \`report.user_conflicts\` array. The most important fields are:

- \`table\`: which table or dataset type conflicts.
- \`id\`: the conflicting record ID.
- \`version\`: the conflicting record version.
- \`state_code\`: the current state of that existing record in the system.
- \`user_id\`: when present, which user owns or is linked to that conflicting record.

Common ways to resolve conflicts:

1. Confirm whether the target system already contains the same user-owned data.
2. If the existing record should stay, update the package \`id\` / \`version\` or remove the duplicate record from the package.
3. If the old record in the target system is no longer needed, handle that old data first and then import again.

## What skipped open-data records mean

Records in \`report.filtered_open_data\` were recognized as open data and skipped automatically. They were not imported into your user data space.

This is usually expected behavior unless you intended those records to be imported as user-owned data.
`,
  },
  'de-DE': {
    humanSummaryTemplate: 'Importergebnis: {code}. Datensätze insgesamt: {total_entries}, übersprungene Open-Data-Datensätze: {filtered_open_data_count}, Konflikte mit benutzereigenen Daten: {user_conflict_count}, importiert: {imported_count}, Validierungsprobleme: {validation_issue_count}.',
    readmeMarkdown: `# So lesen Sie diesen Importbericht

Das Objekt \`report\` in dieser Datei ist das vollständige Ergebnis der Importschnittstelle. Es kann Details zu fehlgeschlagenen Validierungen, Konflikten mit benutzereigenen Daten oder übersprungenen Open-Data-Datensätzen enthalten.

## Was Sie zuerst prüfen sollten

1. Beginnen Sie mit \`report.code\`:
   - \`VALIDATION_FAILED\`: Der Inhalt des Datenpakets ist ungültig. Der Import wurde deshalb blockiert.
   - Andere Fehlercodes bei einem nicht leeren Feld \`user_conflicts\`: In der Zielumgebung liegen bereits benutzereigene Daten vor, die mit dem Paket in Konflikt stehen.
2. Prüfen Sie anschließend \`report.summary\`:
   - \`total_entries\`: Gesamtzahl der im Paket gefundenen Datensätze.
   - \`filtered_open_data_count\`: Anzahl der beim Import übersprungenen Open-Data-Datensätze.
   - \`user_conflict_count\`: Anzahl der Datensätze, die mit vorhandenen benutzereigenen Daten in Konflikt stehen.
   - \`validation_issue_count\`: Gesamtzahl der gefundenen Validierungsprobleme.

## Wo liegt das Problem, wenn die Validierung fehlgeschlagen ist?

Prüfen Sie das Array \`report.validation_issues\`. Besonders wichtig sind folgende Felder:

- \`file_path\`: Datei, in der das Problem aufgetreten ist.
- \`location\`: Betroffener Feldpfad innerhalb dieser Datei.
- \`message\`: Direkte Erläuterung des Validators.
- \`issue_code\`: Art des Problems.
- \`severity\`: Schweregrad. Probleme mit \`error\` müssen in der Regel zuerst behoben werden; Probleme mit \`warning\` sollten ebenfalls geprüft werden.
- \`context\`: Zusätzlicher Diagnosekontext für Entwicklung oder fortgeschrittene Analyse.

Wenn \`location\` schwer zu lesen ist, gehen Sie wie folgt vor:

1. Entpacken Sie das ursprüngliche ZIP-Datenpaket.
2. Öffnen Sie die unter \`file_path\` angegebene Datei.
3. Folgen Sie dem Feldpfad aus \`location\`.
4. Korrigieren Sie die Daten entsprechend \`message\`, erstellen Sie das Paket neu und importieren Sie es erneut.

## Wo liegt das Problem bei Konflikten mit benutzereigenen Daten?

Prüfen Sie das Array \`report.user_conflicts\`. Besonders wichtig sind folgende Felder:

- \`table\`: Tabelle oder Datensatztyp, bei dem der Konflikt aufgetreten ist.
- \`id\`: ID des betroffenen Datensatzes.
- \`version\`: Version des betroffenen Datensatzes.
- \`state_code\`: Aktueller Status des vorhandenen Datensatzes im System.
- \`user_id\`: Sofern vorhanden, die Person, der der betroffene Datensatz gehört oder zugeordnet ist.

Übliche Vorgehensweisen zur Konfliktbehebung:

1. Prüfen Sie, ob das Zielsystem dieselben benutzereigenen Daten bereits enthält.
2. Wenn der vorhandene Datensatz erhalten bleiben soll, ändern Sie \`id\` / \`version\` im Paket oder entfernen Sie das Duplikat aus dem Paket.
3. Wenn der alte Datensatz im Zielsystem nicht mehr benötigt wird, bearbeiten Sie ihn dort zuerst und starten Sie den Import anschließend erneut.

## Was bedeuten übersprungene Open-Data-Datensätze?

Datensätze in \`report.filtered_open_data\` wurden als offene Daten erkannt und automatisch übersprungen. Sie wurden nicht in Ihren Bereich für benutzereigene Daten importiert.

Dieses Verhalten ist normalerweise beabsichtigt. Prüfen Sie es nur dann genauer, wenn diese Datensätze als benutzereigene Daten importiert werden sollten.
`,
  },
  'fr-FR': {
    humanSummaryTemplate: "Résultat de l'importation : {code}. Nombre total d'enregistrements : {total_entries}, enregistrements de données ouvertes ignorés : {filtered_open_data_count}, conflits avec les données utilisateur : {user_conflict_count}, importés : {imported_count}, problèmes de validation : {validation_issue_count}.",
    readmeMarkdown: `# Comment lire ce rapport d'importation

L'objet \`report\` de ce fichier est le résultat complet renvoyé par l'API d'importation. Il peut contenir le détail des échecs de validation, des conflits avec les données utilisateur ou des enregistrements de données ouvertes ignorés.

## Éléments à vérifier en priorité

1. Commencez par \`report.code\` :
   - \`VALIDATION_FAILED\` : le contenu du paquet n'est pas valide ; l'importation a donc été bloquée.
   - Autres codes d'échec avec un champ \`user_conflicts\` non vide : l'environnement cible contient déjà des données utilisateur qui entrent en conflit avec le paquet.
2. Examinez ensuite \`report.summary\` :
   - \`total_entries\` : nombre total d'enregistrements trouvés dans le paquet.
   - \`filtered_open_data_count\` : nombre d'enregistrements de données ouvertes ignorés pendant l'importation.
   - \`user_conflict_count\` : nombre d'enregistrements en conflit avec des données utilisateur existantes.
   - \`validation_issue_count\` : nombre total de problèmes de validation détectés.

## Où trouver le problème en cas d'échec de la validation

Consultez le tableau \`report.validation_issues\`. Les champs les plus importants sont :

- \`file_path\` : fichier contenant le problème.
- \`location\` : chemin du champ concerné dans ce fichier.
- \`message\` : explication directe fournie par le validateur.
- \`issue_code\` : type de problème.
- \`severity\` : niveau de gravité. En règle générale, un problème \`error\` doit être corrigé en priorité, tandis qu'un problème \`warning\` doit également être examiné.
- \`context\` : contexte de diagnostic supplémentaire destiné aux développeurs ou aux utilisateurs expérimentés.

Si \`location\` est difficile à interpréter, procédez comme suit :

1. Décompressez le paquet ZIP d'origine.
2. Ouvrez le fichier indiqué par \`file_path\`.
3. Suivez le chemin de champ fourni dans \`location\`.
4. Corrigez les données conformément à \`message\`, puis reconstituez et réimportez le paquet.

## Où trouver le problème en cas de conflit avec les données utilisateur

Consultez le tableau \`report.user_conflicts\`. Les champs les plus importants sont :

- \`table\` : table ou type de jeu de données concerné par le conflit.
- \`id\` : ID de l'enregistrement en conflit.
- \`version\` : version de l'enregistrement en conflit.
- \`state_code\` : état actuel de l'enregistrement existant dans le système.
- \`user_id\` : lorsqu'il est présent, utilisateur propriétaire de l'enregistrement en conflit ou associé à celui-ci.

Méthodes courantes de résolution des conflits :

1. Vérifiez si le système cible contient déjà les mêmes données utilisateur.
2. Si l'enregistrement existant doit être conservé, modifiez \`id\` / \`version\` dans le paquet ou supprimez l'enregistrement en double du paquet.
3. Si l'ancien enregistrement du système cible n'est plus nécessaire, traitez d'abord ces anciennes données, puis relancez l'importation.

## Signification des enregistrements de données ouvertes ignorés

Les enregistrements de \`report.filtered_open_data\` ont été reconnus comme des données ouvertes et automatiquement ignorés. Ils n'ont pas été importés dans votre espace de données utilisateur.

Ce comportement est généralement normal, sauf si vous souhaitiez importer ces enregistrements comme données utilisateur.
`,
  },
} as const satisfies Record<SupportedAppLocale, ImportReportLocaleContent>;
