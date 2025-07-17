import BigNumber from 'bignumber.js';
import pako from 'pako';
import { LCIAResultTable } from './data';

const LCIAResultCalculation = async (exchangeDataSource: any) => {
  const lciaResults: LCIAResultTable[] = [];

  try {
    const response = await fetch('/lciamethods/list.json');
    if (!response.ok) {
      console.error('Failed to load LCIA methods list:', response.status);
      return;
    }

    const listData = await response.json();

    const useDecompressionStream = 'DecompressionStream' in window;

    for (const file of listData.files) {
      try {
        const gzResponse = await fetch(`/lciamethods/${file.filename}`);
        if (!gzResponse.ok) {
          console.warn(`Failed to load file: ${file.filename}`);
          continue;
        }

        const gzArrayBuffer = await gzResponse.arrayBuffer();

        let decompressed: string;
        if (useDecompressionStream) {
          // Use native DecompressionStream API with stream processing
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(gzArrayBuffer));
              controller.close();
            },
          });

          const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
          decompressed = await new Response(decompressedStream).text();
        } else {
          // Fallback to pako for older browsers
          decompressed = pako.inflate(new Uint8Array(gzArrayBuffer), {
            to: 'string',
          });
        }

        const jsonData = JSON.parse(decompressed);

        const lciaMethodDataSet = jsonData?.LCIAMethodDataSet;
        if (!lciaMethodDataSet) {
          console.warn(`Invalid LCIA method data in file: ${file.filename}`);
          continue;
        }

        const methodInfo = lciaMethodDataSet.LCIAMethodInformation?.dataSetInformation;
        const methodName = methodInfo['common:name'];
        const methodId = methodInfo['common:UUID'];
        const methodVersion =
          lciaMethodDataSet?.administrativeInformation?.publicationAndOwnership?.[
            'common:dataSetVersion'
          ];

        const factors = lciaMethodDataSet?.characterisationFactors?.factor || [];
        if (!Array.isArray(factors) || factors.length === 0) {
          console.warn(`No characterisation factors found in file: ${file.filename}`);
          continue;
        }

        let sumLCIA = new BigNumber(0);
        let matchedExchanges = 0;

        exchangeDataSource.forEach((exchange: any) => {
          const matchingFactor = factors.find((factor: any) => {
            const factorFlowId = factor.referenceToFlowDataSet?.['@refObjectId'];
            const exchangeFlowId = exchange.referenceToFlowDataSet?.['@refObjectId'];
            const factorDirection = String(factor.exchangeDirection || '').toLowerCase();
            const exchangeDirection = String(exchange.exchangeDirection || '').toLowerCase();

            return factorFlowId === exchangeFlowId && factorDirection === exchangeDirection;
          });

          if (matchingFactor) {
            const exchangeAmount = new BigNumber(exchange.meanAmount);
            const factorValue = new BigNumber(matchingFactor.meanValue);

            if (!exchangeAmount.isNaN() && !factorValue.isNaN()) {
              const contribution = exchangeAmount.times(factorValue);
              sumLCIA = sumLCIA.plus(contribution);
              matchedExchanges++;

              // console.log(`Matched exchange: ${exchange.referenceToFlowDataSet?.['@refObjectId']}, Amount: ${exchangeAmount.toString()}, Factor: ${factorValue.toString()}, Contribution: ${contribution.toString()}`);
            }
          }
        });
        if (matchedExchanges > 0) {
          const lciaResult: LCIAResultTable = {
            key: file.id,
            referenceToLCIAMethodDataSet: {
              '@refObjectId': methodId,
              '@type': 'lcia method data', //TODO
              '@uri': `../lciamethods/${methodId}.xml`, //TODO
              '@version': methodVersion,
              'common:shortDescription': methodName,
            },
            meanAmount: sumLCIA.toNumber(),
          };

          lciaResults.push(lciaResult);
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.filename}:`, fileError);
      }
    }
  } catch (error) {
    console.error('Error in LCIA methods processing:', error);
  }

  // console.log(`Total LCIA results calculated: ${lciaResults.length}`,lciaResults);
  return lciaResults;
};

export default LCIAResultCalculation;
