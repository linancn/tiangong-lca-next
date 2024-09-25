export function genClass(data: any) {
  if (data) {
    return data.map((i: any) => {
      return {
        'id': i['@id'],
        'value': i['@name'],
        'label': i['@name'],
        children: genClass(i?.category),
      };
    });
  }
}

export function genClassZH(data: any, dataZH: any) {
  if (data) {
    return data.map((i: any) => {
      const zh = dataZH ? dataZH.find((j: any) => j['@id'] === i['@id']) : null;
      return {
        'id': i['@id'],
        'value': i['@name'],
        'label': zh?.['@name'] ?? i['@name'],
        children: genClassZH(i?.category, zh?.category),
      };
    });
  }
}