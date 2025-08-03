import Link from "next/link"
import { ArrowRight, Zap, Shield, Globe, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Yeti Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 text-9xl opacity-5 transform rotate-12">🏔️</div>
        <div className="absolute top-40 right-32 text-6xl opacity-10 transform -rotate-12">❄️</div>
        <div className="absolute bottom-20 left-10 text-8xl opacity-5 transform rotate-45">🐾</div>
        <div className="absolute top-1/2 left-1/4 text-7xl opacity-5 transform -rotate-45">❄️</div>
        {/* Main Yeti */}
        <div className="absolute bottom-0 right-0 text-[20rem] opacity-5 transform translate-x-20 translate-y-10">
          🦣
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">1X</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              CrossChain
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/swap">
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
                Launch App
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
            Cross-Chain Swaps
            <br />
            <span className="text-4xl md:text-6xl">Made Simple</span>
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Seamlessly swap tokens across Ethereum and SUI networks with our advanced limit order protocol. Experience
            the future of decentralized cross-chain trading.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/swap">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8 py-6"
              >
                Start Trading
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">Why Choose CrossChain?</h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Built on 1inch's proven infrastructure with cutting-edge cross-chain capabilities
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="border-slate-700 shadow-lg hover:shadow-xl transition-shadow bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-purple-900/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Lightning Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-slate-400">
                Execute cross-chain swaps in seconds with our optimized limit order protocol
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-slate-700 shadow-lg hover:shadow-xl transition-shadow bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-pink-900/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-pink-400" />
              </div>
              <CardTitle className="text-white">Secure & Trustless</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-slate-400">
                Built on battle-tested smart contracts with EIP-712 signature verification
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-slate-700 shadow-lg hover:shadow-xl transition-shadow bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-900/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-green-400" />
              </div>
              <CardTitle className="text-white">Multi-Chain</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-slate-400">
                Seamlessly bridge between Ethereum and SUI ecosystems
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-slate-700 shadow-lg hover:shadow-xl transition-shadow bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-orange-900/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-orange-400" />
              </div>
              <CardTitle className="text-white">Best Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-slate-400">
                Powered by 1inch's aggregation technology for optimal pricing
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="bg-slate-800/30 rounded-3xl p-12 border border-slate-700">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-white">How It Works</h2>
            <p className="text-xl text-slate-400">Simple steps to cross-chain success</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Connect Wallet</h3>
              <p className="text-slate-400">Connect your MetaMask wallet to get started with cross-chain trading</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Create Order</h3>
              <p className="text-slate-400">Set your swap parameters and sign the limit order with your wallet</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Execute Swap</h3>
              <p className="text-slate-400">Your tokens are swapped across chains automatically and securely</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-white">Ready to Start Trading?</h2>
          <p className="text-xl text-slate-400 mb-8">Join the future of decentralized cross-chain swaps today</p>
          <Link href="/swap">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-12 py-6"
            >
              Launch App Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 py-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">1X</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              CrossChain
            </span>
          </div>
          <p className="text-slate-400">Built with ❄️ for the decentralized future</p>
        </div>
      </footer>
    </div>
  )
}
