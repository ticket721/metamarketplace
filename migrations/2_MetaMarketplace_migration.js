const { scripts, ConfigManager } = require('@openzeppelin/cli');
const { add, push, create } = scripts;

async function deploy(options) {

    add({ contractsData: [{ name: 'MetaMarketplace_v0', alias: 'MetaMarketplace' }] });

    await push(options);

    const network_id = await web3.eth.net.getId();

    await create(Object.assign({ contractAlias: 'MetaMarketplace', methodName: 'initialize_v0', methodArgs: [network_id] }, options));
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

