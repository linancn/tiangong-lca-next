import { supabase } from '@/services/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function addContacts(data: any) {
    const newID = uuidv4();
    let common_shortName = {};
    if (data?.["common:shortName"] !== undefined) {
        if (data?.["common:shortName"].length === 1) {
            common_shortName = data?.["common:shortName"][0];
        }
        else if (data?.["common:shortName"].length > 1) {
            common_shortName = data?.["common:shortName"];
        }
    }
    let common_name = {};
    if (data?.["common:name"] !== undefined) {
        if (data?.["common:name"].length === 1) {
            common_name = data?.["common:name"][0];
        }
        else if (data?.["common:name"].length > 1) {
            common_name = data?.["common:name"];
        }
    }
    let common_class = {};
    if (data?.["common:class"]?.["@level_0"] !== undefined && data?.["common:class"]?.["@level_0"] !== null && data?.["common:class"]?.["@level_0"].trim() !== "") {
        common_class = {
            "@level": 0,
            "#text": data?.["common:class"]?.["@level_0"],
        };
        if (data?.["common:class"]?.["@level_1"] !== undefined && data?.["common:class"]?.["@level_1"] !== null && data?.["common:class"]?.["@level_1"].trim() !== "") {
            common_class = [
                {
                    "@level": 0,
                    "#text": data?.["common:class"]?.["@level_0"],
                },
                {
                    "@level": 1,
                    "#text": data?.["common:class"]?.["@level_1"],
                },
            ];
            if (data?.["common:class"]?.["@level_2"] !== undefined && data?.["common:class"]?.["@level_2"] !== null && data?.["common:class"]?.["@level_2"].trim() !== "") {
                common_class = [
                    {
                        "@level": 0,
                        "#text": data?.["common:class"]?.["@level_0"],
                    },
                    {
                        "@level": 1,
                        "#text": data?.["common:class"]?.["@level_1"],
                    },
                    {
                        "@level": 2,
                        "#text": data?.["common:class"]?.["@level_2"],
                    },
                ];
            }
        }
    }
    const newData = {
        "contactDataSet": {
            "@xmlns:common": "http://lca.jrc.it/ILCD/Common",
            "@xmlns": "http://lca.jrc.it/ILCD/Contact",
            "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "@version": "1.1",
            "@xsi:schemaLocation": "http://lca.jrc.it/ILCD/Contact ../../schemas/ILCD_ContactDataSet.xsd",
            "contactInformation": {
                "dataSetInformation": {
                    "common:UUID": newID,
                    "common:shortName": common_shortName,
                    "common:name": common_name,
                    "classificationInformation": {
                        "common:classification": {
                            "common:class": common_class,
                        }
                    },
                    "email": data?.email,
                }
            },
            "administrativeInformation": {
                "publicationAndOwnership": {
                    "common:dataSetVersion": data?.["common:dataSetVersion"],
                }
            }
        }
    };

    const { error } = await supabase
        .from('contacts')
        .insert([
            { id: uuidv4(), json_ordered: newData, created_at: new Date() },
        ])
        .select()
    return error;
}