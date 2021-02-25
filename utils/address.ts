import chalk from 'chalk';
export const addresses: {[key: string]: string} = {};

export const getContractAddress = (key: string): string => {
  if (Object.keys(addresses).indexOf(key) < 0) {
    console.error('Address not found');
  }
  return addresses[key];
};

export const setContractAddress = (key: string, value: string): void => {
  addresses[key] = value;
  console.log(chalk.blue(`Set address: ${key} = ${value}`));
};

export const setContractAddresses = (data: {[key: string]: string}): void => {
  Object.keys(data).forEach((key) => {
    addresses[key] = data[key];
    console.log(chalk.blue(`Set address: ${key} = ${data[key]}`));
  });
};
