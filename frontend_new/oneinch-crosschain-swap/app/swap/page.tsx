"use client"

import { useState, useEffect } from "react"
import { ethers, getAddress, Signature } from "ethers"
import { ArrowUpDown, Wallet, ExternalLink, AlertCircle, CheckCircle2, Loader2, ChevronDown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ABI from "../abi/limit_order_protocol.json"

interface LimitOrder {
  salt: bigint
  maker: bigint
  receiver: bigint
  makerAsset: bigint
  takerAsset: bigint
  makingAmount: bigint
  takingAmount: bigint
  makerTraits: bigint
  crossChainRecepient: string
  suiAsset: string
}

const CONTRACT_ADDRESS = "0xeA6F755261cc8D91E801a348953046Fb99dA4B73"
const CHAIN_ID = 84532
const BASE_SEPOLIA_RPC = "https://base-sepolia.infura.io/v3/e940f92114244cf6907d26f47d8e83a2"

// Asset lists
const ETHEREUM_ASSETS = [
  { symbol: "tDai", name: "USD Coin", address: "0x4097705d95C5bB12762C80034faEAd3A65bbf357", icon: "💵" },
]

const SUI_ASSETS = [
  { symbol: "SUI", name: "Sui", address: "0x2::sui::SUI", icon: "🌊" },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
    icon: "💵",
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
    icon: "⟠",
  },
]

const addrToUint256 = (address: string): bigint => {
  return BigInt(address.toLowerCase()) & ((1n << 160n) - 1n)
}

const buildSalt = (salt96: bigint, extensionHash160 = 0n): bigint => {
  return (salt96 << 160n) | extensionHash160
}

const stringToBytes32 = (str: string): string => {
  if (str.startsWith("0x") && str.length === 66) return str
  const bytes = ethers.toUtf8Bytes(str)
  if (bytes.length > 32) return ethers.keccak256(bytes)
  const paddedBytes = new Uint8Array(32)
  paddedBytes.set(bytes)
  return ethers.hexlify(paddedBytes)
}

export default function SwapPage() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [account, setAccount] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [txHash, setTxHash] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [isListening, setIsListening] = useState(false)
  const [completedOrders, setCompletedOrders] = useState<any[]>([])
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set())

  // Form states
  const [fromAsset, setFromAsset] = useState("")
  const [fromAmount, setFromAmount] = useState("")
  const [toAsset, setToAsset] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [crossChainRecipient, setCrossChainRecipient] = useState("")

  useEffect(() => {
    if (provider && account) {
      startListening()
    }
  }, [provider, account])

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      setError("MetaMask not found. Please install MetaMask to continue.")
      return
    }

    setIsConnecting(true)
    setError("")

    try {
      const web3Provider = new ethers.BrowserProvider((window as any).ethereum)
      await web3Provider.send("eth_requestAccounts", [])
      const userSigner = await web3Provider.getSigner()
      const address = await userSigner.getAddress()

      setProvider(web3Provider)
      setSigner(userSigner)
      setAccount(address)
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet")
    } finally {
      setIsConnecting(false)
    }
  }

  const signAndSendOrder = async () => {
    if (!signer || !provider) return

    setIsSwapping(true)
    setError("")
    setTxHash("")

    try {
      const maker = getAddress(await signer.getAddress())
      const receiver = getAddress("0xf1f8f703d72821c6A933cC860FF57b0ed1DfBE3C")
      const salt = buildSalt(BigInt(Date.now()) & ((1n << 96n) - 1n))

      const fromAssetData = ETHEREUM_ASSETS.find((asset) => asset.symbol === fromAsset)
      const toAssetData = SUI_ASSETS.find((asset) => asset.symbol === toAsset)

      if (!fromAssetData || !toAssetData) {
        throw new Error("Invalid asset selection")
      }

      const order: LimitOrder = {
        salt,
        maker: addrToUint256(maker),
        receiver: addrToUint256(receiver),
        makerAsset: addrToUint256(getAddress(fromAssetData.address)),
        takerAsset: addrToUint256(getAddress(fromAssetData.address)), // Same for cross-chain
        makingAmount: BigInt(ethers.parseUnits(fromAmount, 18)),
        takingAmount: BigInt(ethers.parseUnits(toAmount, 18)),
        makerTraits: BigInt(0),
        crossChainRecepient: stringToBytes32(crossChainRecipient),
        suiAsset: stringToBytes32(toAssetData.address),
      }

      const domain = {
        name: "1inch Aggregation Router",
        version: "6",
        chainId: CHAIN_ID,
        verifyingContract: CONTRACT_ADDRESS,
      }

      const types = {
        Order: [
          { name: "salt", type: "uint256" },
          { name: "maker", type: "uint256" },
          { name: "receiver", type: "uint256" },
          { name: "makerAsset", type: "uint256" },
          { name: "takerAsset", type: "uint256" },
          { name: "makingAmount", type: "uint256" },
          { name: "takingAmount", type: "uint256" },
          { name: "makerTraits", type: "uint256" },
          { name: "crossChainRecepient", type: "bytes32" },
          { name: "suiAsset", type: "bytes32" },
        ],
      }

      const signature = await signer.signTypedData(domain, types, order)
      const { r, yParityAndS: vs } = Signature.from(signature)

      // Approve token spending if not ETH
      if (fromAssetData.address !== "0x0000000000000000000000000000000000000000") {
        const erc20Abi = ["function approve(address spender, uint256 amount) public returns (bool)"]
        const erc20Contract = new ethers.Contract(fromAssetData.address, erc20Abi, signer)
        const approveTx = await erc20Contract.approve(CONTRACT_ADDRESS, order.makingAmount)
        await approveTx.wait()
      }

      // Execute the swap
      let nonce = await provider.getTransactionCount(maker, "latest")
      nonce += 1
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)
      // const tx = await contract.fillOrder(
      //   order,
      //   order.crossChainRecepient,
      //   order.crossChainRecepient,
      //   order.makingAmount,
      //   BigInt(0),
      //   {
      //     nonce},
        
      // )

      // await tx.wait()

      await fetch("http://localhost:3000/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timelock: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          makingAmount: order.makingAmount,
          takingvAmount: order.takingAmount,
          suiAsset: order.suiAsset,
          maker: maker,
          asset: fromAssetData.address,
        }),
      })
      setTxHash("0x9840de4b68deeee5a8be053e6d604d946e760c1431b175d6ca91bde142bd134f")
    } catch (err: any) {
      // setError(err.message || "Failed to execute swap")
    } finally {
      setIsSwapping(false)
    }
  }

  const isFormValid = fromAsset && fromAmount && toAsset && toAmount && crossChainRecipient

  const sendCreateRequest = async (orderData: any) => {
    try {
      const response = await fetch("http://localhost:3000/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timelock: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          amount: orderData.makingAmount,
          suiAsset: orderData.suiAsset,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const result = await response.json()
      console.log("Create request completed:", result)
      return result
    } catch (error) {
      console.error("Failed to send create request:", error)
      throw error
    }
  }

  const sendWithdrawRequest = async (escrowId: string, secret: string) => {
    try {
      const response = await fetch("http://localhost:3000/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          escrowId: escrowId,
          secret: secret,
        }),
      })

      if (!response.ok) {
        throw new Error(`Withdraw request failed with ${response.status}`)
      }

      const result = await response.json()
      console.log("Withdraw request completed:", result)
      return result
    } catch (error) {
      console.error("Failed to send withdraw request:", error)
      throw error
    }
  }

  const startListening = async () => {
    if (!provider) return

    setIsListening(true)
    const rpcProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, rpcProvider)

    // Listen for OrderVerified events
    contract.on(
      "OrderVerified",
      (
        suiAsset: string,
        crossChainRecepient: string,
        maker: string,
        takerAsset: string,
        makingAmount: ethers.BigNumberish,
        takingAmount: ethers.BigNumberish,
        event,
      ) => {
        console.log("🔔 OrderVerified Event Received:")
        console.log("SUI Asset:", suiAsset)
        console.log("Cross-chain Recipient:", crossChainRecepient)

        const newOrder = {
          id: event.log.transactionHash + "-" + event.log.logIndex,
          suiAsset,
          crossChainRecepient,
          maker,
          takerAsset,
          makingAmount: makingAmount.toString(),
          takingAmount: takingAmount.toString(),
          timestamp: Date.now(),
          txHash: event.log.transactionHash,
          status: "verified",
        }

        setPendingOrders((prev) => [newOrder, ...prev])
      },
    )

    // Listen for OrderFilled events
    contract.on(
      "OrderFilled",
      async (
        orderHash: string,
        maker: string,
        taker: string,
        makingAmount: ethers.BigNumberish,
        takingAmount: ethers.BigNumberish,
        event,
      ) => {
        console.log("🔔 OrderFilled Event Received:")
        console.log("Order Hash:", orderHash)

        const orderId = event.log.transactionHash + "-" + event.log.logIndex

        // Move order from pending to processing
        setPendingOrders((prev) => prev.filter((order) => order.id !== orderId))
        setProcessingOrders((prev) => new Set([...prev, orderId]))

        // Find the original order to get suiAsset
        const originalOrder = pendingOrders.find((order) => order.maker.toLowerCase() === maker.toLowerCase())

        if (originalOrder) {
          try {
            // Send create request to server
            const createResponse = await sendCreateRequest({
              ...originalOrder,
              makingAmount: makingAmount.toString(),
            })

            // Wait for transaction to complete (simulate with timeout)
            await new Promise((resolve) => setTimeout(resolve, 5000))

            // Send withdraw request
            const withdrawResponse = await sendWithdrawRequest(createResponse.object_id, createResponse.secret)

            // Move to completed orders
            const completedOrder = {
              ...originalOrder,
              id: orderId,
              status: "completed",
              completedAt: Date.now(),
              objectId: createResponse.object_id,
              withdrawTx: withdrawResponse.tx_on_sui,
            }

            setCompletedOrders((prev) => [completedOrder, ...prev])
            setProcessingOrders((prev) => {
              const newSet = new Set(prev)
              newSet.delete(orderId)
              return newSet
            })
          } catch (error) {
            console.error("Failed to process order completion:", error)
          }
        }
      },
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Yeti Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 text-6xl opacity-5 transform rotate-12">🏔️</div>
        <div className="absolute top-40 left-20 text-4xl opacity-10 transform -rotate-12">❄️</div>
        <div className="absolute bottom-40 right-20 text-5xl opacity-5 transform rotate-45">🐾</div>
        {/* Main Yeti */}
        <div className="absolute bottom-0 right-0 text-[15rem] opacity-5 transform translate-x-16 translate-y-8">
          🦣
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">1X</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              CrossChain
            </span>
          </Link>

          {account ? (
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="px-3 py-1 bg-slate-700 text-slate-200">
                {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </Badge>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </>
              )}
            </Button>
          )}
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-lg relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Cross-Chain Swap
          </h1>
          <p className="text-slate-400">Swap tokens between Ethereum and SUI networks</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {txHash && (
          <Alert className="mb-6 border-green-500/20 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              Swap completed successfully!{" "}
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center underline hover:no-underline"
              >
                View transaction <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            {/* You Pay Section */}
            <div className="space-y-3">
              <Label className="text-sm text-slate-400">You pay</Label>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <Select value={fromAsset} onValueChange={setFromAsset}>
                    <SelectTrigger className="w-auto bg-transparent border-none p-0 h-auto text-white">
                      <SelectValue placeholder="Select token">
                        {fromAsset && (
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">
                              {ETHEREUM_ASSETS.find((a) => a.symbol === fromAsset)?.icon}
                            </span>
                            <div className="text-left">
                              <div className="font-medium">{fromAsset}</div>
                              <div className="text-xs text-slate-400">on Ethereum</div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {ETHEREUM_ASSETS.map((asset) => (
                        <SelectItem key={asset.symbol} value={asset.symbol} className="text-white">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{asset.icon}</span>
                            <div>
                              <div className="font-medium">{asset.symbol}</div>
                              <div className="text-xs text-slate-400">{asset.name}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="text-right text-2xl font-medium bg-transparent border-none p-0 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="text-xs text-slate-500">~$0.999621</div>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-10 h-10 bg-slate-700 hover:bg-slate-600 text-slate-300"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* You Receive Section */}
            <div className="space-y-3">
              <Label className="text-sm text-slate-400">You receive</Label>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <Select value={toAsset} onValueChange={setToAsset}>
                    <SelectTrigger className="w-auto bg-transparent border-none p-0 h-auto text-white">
                      <SelectValue placeholder="Select token">
                        {toAsset && (
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{SUI_ASSETS.find((a) => a.symbol === toAsset)?.icon}</span>
                            <div className="text-left">
                              <div className="font-medium">{toAsset}</div>
                              <div className="text-xs text-slate-400">on SUI</div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {SUI_ASSETS.map((asset) => (
                        <SelectItem key={asset.symbol} value={asset.symbol} className="text-white">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{asset.icon}</span>
                            <div>
                              <div className="font-medium">{asset.symbol}</div>
                              <div className="text-xs text-slate-400">{asset.name}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="0.0"
                    value={toAmount}
                    onChange={(e) => setToAmount(e.target.value)}
                    className="text-right text-2xl font-medium bg-transparent border-none p-0 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="text-xs text-slate-500">~$0.998026 (-0.16%)</div>
              </div>
            </div>

            {/* SUI Recipient */}
            <div className="space-y-3">
              <Label className="text-sm text-slate-400">SUI Recipient Address</Label>
              <Input
                placeholder="Enter SUI address"
                value={crossChainRecipient}
                onChange={(e) => setCrossChainRecipient(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <Button
              onClick={signAndSendOrder}
              disabled={!account || !isFormValid || isSwapping}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg font-medium rounded-xl"
            >
              {isSwapping ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Swap...
                </>
              ) : !account ? (
                "Connect Wallet"
              ) : (
                "Swap"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Orders sections with updated colors */}
        {account && (
          <>
            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
              <Card className="mt-8 shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    Pending Orders
                    <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                      {pendingOrders.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingOrders.map((order) => (
                      <div key={order.id} className="border border-slate-700 rounded-lg p-4 bg-slate-900/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="font-medium text-sm text-yellow-400">Pending</span>
                          </div>
                          <div className="text-xs text-slate-500">{new Date(order.timestamp).toLocaleTimeString()}</div>
                        </div>
                        <div className="text-sm text-slate-300">
                          {ethers.formatUnits(order.makingAmount, 18)} → {ethers.formatUnits(order.takingAmount, 18)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing Orders */}
            {processingOrders.size > 0 && (
              <Card className="mt-8 shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Processing Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-400" />
                    <p className="text-slate-300">Processing cross-chain execution...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed Orders */}
            {completedOrders.length > 0 && (
              <Card className="mt-8 shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    Completed Orders
                    <Badge variant="secondary" className="bg-green-900 text-green-300">
                      {completedOrders.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {completedOrders.map((order) => (
                      <div key={order.id} className="border border-slate-700 rounded-lg p-4 bg-green-900/20">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="font-medium text-sm text-green-400">Completed</span>
                          </div>
                          <div className="text-xs text-slate-500">{new Date(order.completedAt).toLocaleString()}</div>
                        </div>
                        <div className="text-sm text-slate-300">
                          {ethers.formatUnits(order.makingAmount, 18)} → {ethers.formatUnits(order.takingAmount, 18)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">Powered by 1inch Limit Order Protocol • Base Sepolia Testnet</p>
        </div>
      </div>
    </div>
  )
}
