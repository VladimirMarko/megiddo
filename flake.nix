{
  description = "megiddo";

  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.otel-gui = {
    url = "https://github.com/metafab/otel-gui/releases/download/v2.0.0/otel-gui-linux-x64.tar.gz";
    flake = false;
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      otel-gui,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        otelGui = pkgs.stdenv.mkDerivation {
          pname = "otel-gui";
          version = "2.0.0";
          src = otel-gui;

          dontFixup = true;

          installPhase = ''
            runHook preInstall

            mkdir -p $out/bin $out/share/otel-gui
            cp -R . $out/share/otel-gui
            ln -s $out/share/otel-gui/otel-gui $out/bin/otel-gui

            runHook postInstall
          '';
        };
      in
      {
        devShells.default = pkgs.mkShell {

          packages = with pkgs; [
            git
            gh
            jq
            nodejs
            pnpm
            nixfmt
            opencode
            xdg-utils
            otelGui
          ];

          shellHook = ''
            pnpm install --frozen-lockfile
          '';

        };
      }
    );
}
