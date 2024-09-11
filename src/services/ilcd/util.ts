export function genClassZH(data: any, dataZH: any) {
  if (data) {
    return data.map((i: any) => {
      const zh = dataZH ? dataZH.find((j: any) => j['@id'] === i['@id']) : null;
      return {
        '@id': i['@id'],
        '@name': i['@name'],
        '@nameZH': zh?.['@name'] ?? i['@name'],
        category: genClassZH(i?.category, zh?.category),
      };
    });
  }
}
