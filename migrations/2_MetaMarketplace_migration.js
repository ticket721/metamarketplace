const { scripts, ConfigManager } = require('@openzeppelin/cli');
const { add, push, create } = scripts;

async function deploy(options) {

    add({ contractsData: [{ name: 'MetaMarketplace_v0', alias: 'MetaMarketplace' }] });

    await push(options);

    await create(Object.assign({ contractAlias: 'PlaceHolder', methodName: 'initialize' }, options));
}

module.exports = async function(deployer, networkName, accounts) {
    if (['test', 'soliditycoverage'].indexOf(networkName) === -1) {

        await deployer.then(async () => {
            const {network, txParams} = await ConfigManager.initNetworkConfiguration({
                network: networkName,
                from: accounts[1]
            });
            await deploy({network, txParams});
        })

    }
};

